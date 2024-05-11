#![warn(clippy::pedantic)]

use std::collections::HashSet;
use std::env;
use std::fs::File;
use std::future::Future;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::AtomicU64;
use std::sync::atomic::Ordering::Relaxed;
use std::sync::Mutex;
use std::time::Duration;

use aho_corasick::AhoCorasick;
use dotenvy::dotenv;
use futures::future::join_all;
use futures::StreamExt;
use indicatif::{ProgressBar, ProgressStyle};
use lazy_static::lazy_static;
use regex::{Captures, Regex};
use scraper::{Html, Selector};
use tokio::sync::Semaphore;
use url::Url;

use crate::db::Db;
use crate::entities::SchoolWithWebsite;

mod db;
mod entities;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const CONCURRENT_REQUESTS_LIMIT: usize = 128;
const REQUEST_SEMAPHORE_TIMEOUT: Duration = Duration::from_secs(2);
const CONCURRENT_SCHOOLS_LIMIT: usize = 32;

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
async fn main() {
    if let Err(error) = dotenv() {
        if !error.not_found() {
            panic!("dotenv failed {}", error);
        }
    }

    let db = Db::new(&env::var("DATABASE_URL").expect("DATABASE_URL env variable should be set"))
        .await
        .unwrap();

    let schools = db.get_schools_with_website().await.unwrap();
    println!("{:?}", schools.len());

    let progress_style = ProgressStyle::with_template("[{elapsed_precise}] {wide_bar:.cyan/blue} {pos:>7}/{len:7} {percent_precise}% | ETA: {eta}").unwrap().progress_chars("##-");
    let pb = ProgressBar::new(schools.len() as u64).with_style(progress_style);

    let reqwest_client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .unwrap();

    let request_semaphore = Semaphore::new(CONCURRENT_REQUESTS_LIMIT);

    let x = AtomicU64::new(0);

    pb.tick();

    let file_path = PathBuf::from("/tmp/crawler-timetables.txt");
    let file = Mutex::new(File::create(&file_path).unwrap());
    println!("Opened {}", file_path.display());

    let stream = futures::stream::iter(schools.into_iter().map(|school| {
        let reqwest_client = reqwest_client.clone();
        let x_ref = &x;
        let pb = pb.clone();
        let request_semaphore = &request_semaphore;
        let file = &file;
        async move {
            let rspo_id = school.rspo_id;
            let timetables = crawl_school(school, &reqwest_client, request_semaphore).await;
            if !timetables.is_empty() {
                println!(
                    "Found potential timetables for school {}:\n{:?}",
                    rspo_id,
                    timetables.iter().map(|url| url.as_str()).collect::<Vec<_>>()
                );
                let mut file = file.lock().unwrap();
                timetables.iter().for_each(|timetable_url| {
                    file.write_all(format!("{rspo_id}|{}\n", timetable_url.as_str()).as_bytes()).unwrap();
                });
            }
            x_ref.fetch_add(1, Relaxed);
            pb.inc(1);
        }
    }));
    stream.buffer_unordered(CONCURRENT_SCHOOLS_LIMIT).collect::<Vec<()>>().await;

    pb.finish();

    println!("Completed {} tasks", x.load(Relaxed));
}

struct CrawlState {
    visited_urls: HashSet<Url>,
    optivum_candidates: Vec<Url>,
}

impl CrawlState {
    fn new() -> CrawlState {
        CrawlState {
            visited_urls: HashSet::new(),
            optivum_candidates: Vec::new(),
        }
    }
}

fn normalize_url(mut url: Url) -> Option<Url> {
    if url.scheme() != "http" && url.scheme() != "https" { return None; }
    let host = match url.host_str() {
        Some(host) if host.starts_with("www.") => {
            Some(&host[4..])
        },
        other => other,
    }.map(|host| host.to_string());
    url.set_host(host.as_deref()).ok()?;
    Some(url)
}

fn parse_and_normalize_url(url: &str, base: &Url) -> Option<Url> {
    normalize_url(base.join(url).ok()?)
}

async fn crawl_school(school: SchoolWithWebsite, reqwest_client: &reqwest::Client, request_semaphore: &Semaphore) -> Vec<Url> {
    let Some(url) = Url::parse(&school.website_url).ok().and_then(normalize_url) else {
        // println!("Failed to parse URL {}", school.website_url);
        return Vec::new();
    };
    let state = Mutex::new(CrawlState::new());
    crawl_dfs(&url, 3, reqwest_client, request_semaphore, &state).await;
    let state = state.into_inner().unwrap();
    state.optivum_candidates
}

fn contains_keyword(string: &str) -> bool {
    const KEYWORDS: [&str; 13] = [
        "plan",
        "harmonogram",
        "tutaj",
        "kliknij",
        "naciśnij",
        "nacisnij",
        "podzial",
        "podział",
        "rozkład",
        "rozklad",
        "timetable",
        "lekcj",
        "schedule",
    ];

    lazy_static! {
        static ref KEYWORD_MATCHER: AhoCorasick = AhoCorasick::new(KEYWORDS).unwrap();
    }

    KEYWORD_MATCHER.is_match(&string.to_lowercase())
}

fn find_links(document: &Html, document_url: &Url) -> HashSet<Url> {
    lazy_static! {
        static ref LINK_SELECTOR: Selector = Selector::parse("a[href]").unwrap();
        static ref IMG_SELECTOR: Selector = Selector::parse("img").unwrap();
        static ref IFRAME_SELECTOR: Selector = Selector::parse("iframe[src]").unwrap();
        static ref SCRIPT_SELECTOR: Selector = Selector::parse("script").unwrap();

        static ref SCRIPT_ESCAPE_REGEX: Regex = Regex::new(r"\\\\(.)").unwrap();
        static ref SCRIPT_URL_REGEX: Regex = Regex::new(r"(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+").unwrap();
    }

    let mut links: HashSet<Url> = HashSet::new();

    document.select(&LINK_SELECTOR)
        .filter(|link| {
            link.attr("href").is_some_and(contains_keyword)
            || link.text().any(contains_keyword)
            || link.select(&IMG_SELECTOR).any(|img| {
                img.attr("src").is_some_and(contains_keyword) || img.attr("alt").is_some_and(contains_keyword)
            })
        })
        .for_each(|link| {
            let url = link.attr("href").expect("Link should contain href attr because the CSS selector requires it");
            if let Some(url) = parse_and_normalize_url(url, document_url) {
                links.insert(url);
            }
        });

    document.select(&IFRAME_SELECTOR).for_each(|iframe| {
        let url = iframe.attr("src").expect("Iframe should contain src attr because the CSS selector requires it");
        if let Some(url) = parse_and_normalize_url(url, document_url) {
            links.insert(url);
        }
    });

    document.select(&SCRIPT_SELECTOR).for_each(|script| {
        let content = script.inner_html();
        let content = SCRIPT_ESCAPE_REGEX.replace_all(&content, |caps: &Captures| caps[1].to_string());
        SCRIPT_URL_REGEX.find_iter(&content).for_each(|url| {
            let url = url.as_str();
            if contains_keyword(url) {
                if let Some(url) = parse_and_normalize_url(url, document_url) {
                    links.insert(url);
                }
            }
        })
    });

    links
}

fn is_optivum_candidate(document: &Html) -> bool {
    lazy_static! {
        static ref META_DESCRIPTION_SELECTOR: Selector = Selector::parse("meta[name=\"description\"]").unwrap();
    }

    document.select(&META_DESCRIPTION_SELECTOR).any(|tag| {
        tag.attr("content").is_some_and(|content| {
            content.contains("programu Plan lekcji Optivum firmy VULCAN") || content.contains("Plan lekcji w szkole")
        })
    })
}

/// Acquires `semaphore` and then runs `cb`.
/// Semaphore permit is released when job is done
/// or after `timeout` passes, whichever is first.
async fn with_semaphore<
    'a,
    T: Send + 'static,
    R: Future<Output = T> + Send + 'static,
    CB: FnOnce() -> R + Send + 'a,
>(semaphore: &'a Semaphore, cb: CB, timeout: Duration) -> T {
    let permit = Some(semaphore.acquire().await.unwrap());
    let timeout_job = tokio::spawn(tokio::time::sleep(timeout));
    let timeout_abort_handle = timeout_job.abort_handle();
    let cb_future = cb();
    let action_job = tokio::spawn(async move {
        let result = cb_future.await;
        timeout_abort_handle.abort();
        result
    });
    match timeout_job.await {
        Err(err) if err.is_cancelled() => {},
        Ok(()) => {},
        Err(err) => panic!("{}", err),
    };
    drop(permit);
    action_job.await.unwrap()
}

/// `url` should be normalized
async fn crawl_dfs(url: &Url, remaining_depth: u8, reqwest_client: &reqwest::Client, request_semaphore: &Semaphore, state: &Mutex<CrawlState>) {
    let already_added = !state.lock().unwrap().visited_urls.insert(url.clone());
    if already_added { return }

    // println!("Processing URL: {}", url.as_str());

    let response = {
        let url = url.clone();
        with_semaphore(
            request_semaphore,
            move || reqwest_client.get(url).send(),
            REQUEST_SEMAPHORE_TIMEOUT,
        ).await
    };
    let response = match response {
        Ok(response) => response,
        Err(error) => {
            println!("Failed to fetch {}\nReason: {}", &url.as_str(), error);
            return;
        },
    };
    let Ok(html) = response.text().await else { return };
    let document = Html::parse_document(&html);

    // println!("Title: \"{}\"", document.select(&Selector::parse("head title").unwrap()).next().map(|x| x.inner_html()).unwrap_or("<no title>".to_string()));

    if is_optivum_candidate(&document) {
        state.lock().unwrap().optivum_candidates.push(url.clone());
        return
    }

    if remaining_depth > 0 {
        let child_links = find_links(&document, url);
        join_all(
            child_links.into_iter().map(|link_url| async move {
                crawl_dfs(&link_url, remaining_depth - 1, reqwest_client, request_semaphore, state).await;
            })
        ).await;
    }
}
