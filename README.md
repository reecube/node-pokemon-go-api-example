# node-pokemon-go-api-example

This is a node example project for the node module https://github.com/Armax/Pokemon-GO-node-api.git.

## Description

This project will build HTML-files, showing the nearby Pokemon on a Google Map.

You can change the steps/radius in the code if you want to.

The generated HTML-file is stored in /example/public/index.html.

## Installation

First install the npm dependencies:

```
npm install
```

Then make the config file, here is an example:

```
{
    "username": "TODO",
    "password": "TODO",
    "provider": "TODO:ptc/google",
    "location": {
        "name": "TODO"
        "coords": {
            "latitude": TODO,
            "longitude": TODO,
            "altitude": TODO
        },
        "type": "TODO: name/coords",
    },
    "steps": TODO,
    "maps": {
        "apikey": "TODO"
    }
}

```

This file is stored under `/example/example-config.json`.

## Build

```
node .
```

## Serve

This example can't serve the generated HTML-files, but you can use live-server to serve them:
http://tapiov.net/live-server/

### Installation

```
npm install -g live-server
```

### Usage

```
cd example/public
live-server
```