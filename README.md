# Ocelot.Social

[![Build Status Test](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test.yml/badge.svg)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions)
[![Build Status Publish](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/publish.yml/badge.svg)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/LICENSE.md)
[![Discord Channel](https://img.shields.io/discord/489522408076738561.svg)](https://discord.gg/AJSX9DCSUA)
[![Open Source Helpers](https://www.codetriage.com/ocelot-social-community/ocelot-social/badges/users.svg)](https://www.codetriage.com/ocelot-social-community/ocelot-social)

[ocelot.social](https://ocelot.social) is free and open source software program code to run social networks. Its development is supported by a community of programmers and interested network operators.

<p align="center">
  <a href="https://ocelot.social" target="_blank"><img src="webapp/static/img/custom/logo-squared.svg" alt="ocelot.social" width="40%" height="40%"></a>
</p>

Our goal is to enable people to participate fairly and equally in online social networks. The equality of opportunity applies both to the fundamental equality of all people and to the possibility of letting their diverse voices be heard.

We therefore consider it desirable that operators offer such networks so that people can choose where they want to be on the move.

At the same time, it should be possible in the future to link these networks with each other (ActivityPub, Fediverse), so that users can also connect with people from other networks - for example by making friends or following posts or other contributions.

In other words, we are interested in a network of networks and in keeping the data as close as possible to the user and the operator they trusts.

## Directory Layout

There are three important directories:

* [Backend](./backend) runs on the server and is a middleware between database and frontend
* [Frontend](./webapp) is a server-side-rendered and client-side-rendered web frontend
* [Cypress](./cypress) contains end-to-end tests and executable feature specifications

In order to setup the application and start to develop features you have to
setup **frontend** and **backend**.

There are two approaches:

1. [Local](#local-installation) installation, which means you have to take care of dependencies yourself.
2. **Or** Install everything through [Docker](#docker-installation) which takes care of dependencies for you.

## Installation

### Clone the Repository

Clone the repository, this will create a new folder called `Ocelot-Social`:

Using HTTPS:

```bash
$ git clone https://github.com/Ocelot-Social-Community/Ocelot-Social.git
```

Using SSH:

```bash
$ git clone git@github.com:Ocelot-Social-Community/Ocelot-Social.git
```

Change into the new folder.

```bash
$ cd Ocelot-Social
```

### Docker Installation

Docker is a software development container tool that combines software and its dependencies into one standardized unit that contains everything needed to run it. This helps us to avoid problems with dependencies and makes installation easier.

#### General Installation of Docker

There are [several ways to install Docker CE](https://docs.docker.com/install/) on your computer or server.

 * [install Docker Desktop on macOS](https://docs.docker.com/docker-for-mac/install/)
 * [install Docker Desktop on Windows](https://docs.docker.com/docker-for-windows/install/)
 * [install Docker CE on Linux](https://docs.docker.com/install/)

Check the correct Docker installation by checking the version before proceeding. E.g. we have the following versions:

```bash
$ docker --version
Docker version 18.09.2
$ docker-compose --version
docker-compose version 1.23.2
```

#### Start Ocelot-Social via Docker-Compose

Prepare ENVs once beforehand:

```bash
# in folder webapp/
$ cp .env.template .env

# in folder backend/
$ cp .env.template .env
```

For Development:

```bash
# in main folder
$ docker-compose up
```

For Production:

```bash
# in main folder
$ docker-compose -f docker-compose.yml up
```

This will start all required Docker containers.  
Make sure your database is running on `http://localhost:7474/browser/`.

Prepare database once before you start:

```bash
# in folder backend/
yarn run db:migrate init
```

Then clear and seed database:

```bash
# in folder backend/
$ yarn run db:reset && db:seed
```

For a closer description see [backend README.md](./backend/README.md).  
For a full documentation see [SUMMARY](./SUMMARY.md).

### Local Installation

For a full documentation see [SUMMARY](./SUMMARY.md).

## Contributing

Choose an issue (consider our label [good-first-issue](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)) and leave a comment there. We will then invite you to join our volunteers team.
To have the necessary permission to push directly to this repository, please accept our invitation to join our volunteers team, you will receive via the email, Github will send you, once invited. If we did not invite you yet, please request an invitation via Discord.

We are happy if you fork our repository, but we don't recommend it for development. You do not need a fork.

Clone this repository locally as [described above](#clone-the-repository), create your branch named `<issue-number>-<description>`, add your code and push your branch to this repository. Then create a PR by comparing it to our `master`.

Please run the following commands before you push:

```bash
# in folder backend/
$ yarn lint --fix
$ yarn test
```

```bash
# in folder webapp/
$ yarn lint --fix
$ yarn locales --fix
$ yarn test
```

Check out our [contribution guideline](./CONTRIBUTING.md), too!

### Developer Chat

Join our friendly open-source community on [Discord](https://discord.gg/AJSX9DCSUA) :heart_eyes_cat:
Just introduce yourself at `#introduce-yourself` and mention a mentor or `@@Mentors` to get you onboard :neckbeard:

We give write permissions to every developer who asks for it. Just text us on
[Discord](https://discord.gg/AJSX9DCSUA).

## Deployment

Deployment methods can be found in the [Ocelot-Social-Deploy-Rebranding](https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding) repository.

The only deployment method in this repository for development purposes as described above is `docker-compose`.

## Technology Stack

* [VueJS](https://vuejs.org/)
* [NuxtJS](https://nuxtjs.org/)
* [GraphQL](https://graphql.org/)
* [NodeJS](https://nodejs.org/en/)
* [Neo4J](https://neo4j.com/)

## Attributions

Locale Icons made by [Freepik](http://www.freepik.com/) from [www.flaticon.com](https://www.flaticon.com/) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/).

Browser compatibility testing with [BrowserStack](https://www.browserstack.com/).

<img alt="BrowserStack Logo" src=".gitbook/assets/browserstack-logo.svg" width="256">

## License

See the [LICENSE](LICENSE.md) file for license rights and limitations (MIT).
