# Timetable API

An REST API for timetables of many Polish schools.
Intended for use in the https://github.com/dominik-korsa/timetable project.

The API is currently hosted at https://tapi.dk-gl.eu. That's where you can find
the auto-generated docs for all endpoints.

The project consists of a few parts:
- PostgreSQL database
- A script for syncing our database with the Polish Government's school list API
  (https://rspo.gov.pl/)
- A crawler which utilizes web scraping to find timetable sources on the
  websites of individual schools
- A parser for VULCAN Optivum timetables
- A parser for Edupage timetables
- A REST API to access data from the database
- A Web Push notification server

The codebase uses **Node.js** and **Rust**