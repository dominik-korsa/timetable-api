import json
from urllib.parse import urljoin, urlparse
from aiohttp import ClientSession
from bs4 import BeautifulSoup
from logging import getLogger, basicConfig, DEBUG

basicConfig(level=DEBUG)

KEYWORDS: list[str] = [
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
]
RSPO_API_BASE_URL: str = "https://api-rspo.mein.gov.pl/api"


class FailedRequestException(Exception):
    pass


class OptivumTimetablesListGenerator:
    def __init__(self) -> None:
        self._logger = getLogger("optivum-timetable-list-generator")

    def find_links_on_page(self, html: str) -> list[str]:
        soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
        links: list[str] = []
        for link in soup.select("a"):
            if not link.has_attr("href"):
                continue
            for keyword in KEYWORDS:
                if keyword in link.text.lower():
                    links.append(link["href"])
                    break
        return list(dict.fromkeys(links))

    def check_timetable(self, html: str) -> bool:
        soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
        return (
            soup.select_one('meta[name="description"]')
            and " programu Plan lekcji Optivum firmy VULCAN"
            in soup.select_one('meta[name="description"]')["content"]
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

    async def find_timetables_on_website(self, url: str) -> list[str]:
        timetable: list[str] = []
        requests: int = 1
        links: list[str] = [
            urljoin(url, link)
            for link in self.find_links_on_page(await self._request(url))
        ]
        links = list(dict.fromkeys(links))
        for link in links:
            if requests >= 30:
                return []
            links += [
                urljoin(url, l)
                for l in self.find_links_on_page(await self._request(link))
                if l != link
            ]
            links = list(dict.fromkeys(links))
            requests += 1
        for link in links:
            if requests >= 30:
                return []
            if self.check_timetable(await self._request(link)):
                timetable.append(link.rstrip("/"))
            requests += 1
        return list(dict.fromkeys(timetable))

    async def _request(self, url: str, method: str = "GET", **kwargs) -> str:
        headers: dict = {"User-Agent": "optivum-timetables-list-generator"}
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
                return await response.text()
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
                try:
                    timetables: list[str] = await self.find_timetables_on_website(url)
                except:
                    timetables: list[str] = []
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
                    with open(file, "r") as data:
                        data_json = json.loads(data.read())
                    with open(file, "w") as data:
                        data_json.append(
                            {
                                "rspoId": school["numerRspo"],
                                "timetables": timetables,
                            }
                        )
                        json.dump(data_json, data)
            page += 1
