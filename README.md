## NPM Git Registry
Simple NPM proxy backed by Git hosting providers

## Prerequisites
### Server
Standard node app. See `package.json`

### Client
NPM version 2 or above. Uses scoping: https://www.npmjs.org/doc/misc/npm-scope.html

## Installation
- Create heroku application
- `heroku login`
- `heroku git:remote -a [appname]`
- `git push -u heroku master`

## Config
- Define your scope in `config/scope-mappings.json`

## Usage
- `npm login --registry=[herokuurl] --scope=@myscope`
- `npm install @myscope/mypackage`

## Acknowledgements
Fork of https://bitbucket.org/ripple-engine/npm-git-registry from [Jan Kuča](https://github.com/jankuca)
