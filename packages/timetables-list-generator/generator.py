import json
from urllib.parse import urljoin, urlparse
from aiohttp import ClientSession
from bs4 import BeautifulSoup
from logging import getLogger, basicConfig, DEBUG
from queue import SimpleQueue

basicConfig(level=DEBUG)

KEYWORDS = {
    "plan",
    "plany",
    "harmonogram",
    "harmonogramy",
    "tutaj",
    "kliknij",
    "naciśnij",
    "nacisnij",
    "podzial godzin",
    "podzialy godzin",
    "podział godzin",
    "podziały godzin",
    "rozkład",
    "rozkłady",
}
RSPO_API_BASE_URL: str = "https://api-rspo.mein.gov.pl/api"


class FailedRequestException(Exception):
    pass


class TimetablesListGenerator:
    def __init__(self) -> None:
        self._logger = getLogger("timetables-list-generator")

    def find_links_on_page(self, html: str) -> set[str]:
        soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
        links = set[str]()
        for link in soup.select("a"):
            if not link.has_attr("href"):
                continue
            for keyword in KEYWORDS:
                if keyword in link.text.lower():
                    links.add(link["href"])
                    break
        return links

    def check_timetable(self, html: str) -> bool:
        soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
        meta_description = soup.select_one('meta[name="description"]')
        return (
            (
                meta_description is not None
                and " programu Plan lekcji Optivum firmy VULCAN"
                in meta_description["content"]
            )
            or "<div style='margin:7px;'><a style='color:inherit' target='_blank' href='http://www.asctimetables.com/timetables_pl.html'>aSc Plan Lekcji - program do tworzenia planu lekcji</a></div>"
            in html
        )

    async def check_url_from_rspo(self, raw_url: str) -> str | None:
        try:
            url = urlparse(raw_url)
        except:
            return None
        if url.scheme:
            try:
                await self._request(url)
            except:
                return None
            return url.geturl()
        try:
            await self._request(
                url._replace(scheme="https").geturl().replace(":///", "://")
            )
        except:
            try:
                await self._request(
                    url._replace(scheme="http").geturl().replace(":///", "://")
                )
            except:
                return None
            return url._replace(scheme="http").geturl().replace(":///", "://")
        return url._replace(scheme="https").geturl().replace(":///", "://")

    async def find_timetables_on_website(self, url: str) -> set[str]:
        timetables = set[str]()
        request_count: int = 1
        queue = SimpleQueue()
        for link in self.find_links_on_page(await self._request(url)):
            queue.put(urljoin(url, link).rstrip("/"))
        checked_links = set[str]()
        while not queue.empty():
            if request_count >= 30:
                break
            request_count += 1

            link = queue.get_nowait()
            if link in checked_links:
                continue
            checked_links.add(link)

            try:
                html, response_url = await self._request(link, return_response_url=True)
            except FailedRequestException:
                continue

            if self.check_timetable(html):
                timetables.add(str(response_url))
                checked_links.add(str(response_url))
                continue
            for l in self.find_links_on_page(html):
                queue.put(l)
        return timetables

    async def _request(
        self, url: str, method: str = "GET", return_response_url: bool = False, **kwargs
    ) -> str:
        headers: dict = {"User-Agent": "timetables-list-generator"}
        if kwargs.get("headers"):
            headers.update(kwargs.get("headers"))
            kwargs.pop("headers")
        try:
            async with ClientSession() as session:
                response = await session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    **kwargs,
                )
                self._logger.debug(
                    f"[{response.status}] {response.method} {response.url}"
                )
                try:
                    if return_response_url:
                        return await response.text(), response.url
                    return await response.text()
                except:
                    if return_response_url:
                        return "", response.url
                    return ""
        except:
            raise FailedRequestException()

    async def generate_list_from_rspo_api_data(
        self,
        base_url: str = RSPO_API_BASE_URL,
        file: str = "./schools.json",
        page: int = 1,
    ) -> None:
        self._logger.info(
            "{:<4} {:<7} {:<40} {:<40} {:<6} {:<80}".format(
                "PAGE",
                "RSPO ID",
                "SCHOOL NAME",
                "SCHOOL WEBSITE",
                "ERROR",
                "TIMETABLES",
            )
        )
        while True:
            schools = json.loads(
                await self._request(
                    f"{base_url}/placowki",
                    headers={"Accept": "application/json"},
                    params={"zlikwidowana": "false", "page": page},
                )
            )
            if not schools:
                break
            for school in schools:
                if not school["stronaInternetowa"]:
                    self._logger.info(
                        "{:<4} {:<7} {:<40} {:<40} {:<6} {:<80}".format(
                            page,
                            school["numerRspo"] or "-",
                            school["nazwaSkrocona"] or "-",
                            school["stronaInternetowa"] or "-",
                            "noweb",
                            "-",
                        )
                    )
                    continue
                url = await self.check_url_from_rspo(school["stronaInternetowa"])
                if not url:
                    self._logger.info(
                        "{:<4} {:<7} {:<40} {:<40} {:<6} {:<80}".format(
                            page,
                            school["numerRspo"] or "-",
                            school["nazwaSkrocona"] or "-",
                            school["stronaInternetowa"] or "-",
                            "invurl",
                            "-",
                        )
                    )
                    continue
                timetables = list(await self.find_timetables_on_website(url))
                self._logger.info(
                    "{:<4} {:<7} {:<40} {:<40} {:<6} {:<80}".format(
                        page,
                        school["numerRspo"] or "-",
                        school["nazwaSkrocona"] or "-",
                        school["stronaInternetowa"] or "-",
                        "-",
                        str(timetables) or "-",
                    )
                )
                if timetables:
                    try:
                        with open(file, "r") as data:
                            data_json = json.loads(data.read())
                    except FileNotFoundError:
                        data_json = []
                    with open(file, "w") as data:
                        data_json.append(
                            {
                                "rspoId": school["numerRspo"],
                                "timetables": timetables,
                            }
                        )
                        json.dump(data_json, data)
            page += 1
