# Falcon Vendure API

This is an experimental api provider for [DEITY Falcon](https://github.com/deity-io/falcon). The goal is to allow Falcon to be used as a storefront for Vendure.

## Current Status

Currently I have implemented basic product list & detail views. It is very experimental and most aspects are not yet working.

## Development

1. Assumes that the main Vendure repo is cloned in a sibling directory, since the [codegen.yml](./codegen.yml) file is pointing to the Vendure GraphQL introspection schema in that location.
2. Run `yarn start:dev` which will start up:
   * **graphql-code-generator** (to auto generate TypeScript types for the Vendure & Falcon schemas) in watch mode.
   * **tsc** (the TypeScript compiler) in watch mode.

## Testing

1. Assumes a Vendure server running on port 5000 with the GraphQL api set to "api".
2. Set the Falcon server config like this:
    ```json
    {
      "apis": {
        "vendure-api": {
          "package": "../../deity-falcon-vendure-api",
          "config": {
            "host": "localhost",
            "port": 5000,
            "apiPath": "api",
            "protocol": "http"
          }
        }
      },
      "extensions": {
        "shop": {
          "package": "@deity/falcon-shop-extension",
          "config": {
            "api": "vendure-api"
          }
        }
      }
    }
    ```
    Note that the path to the "vendure-api" package varies according to the relative locations of this repo and the Falcon server.
3. The menu config for Falcon client can be configured like this:
    ```json
    {
      "header": [
        {
          "name": "Electronics",
          "url": "/category/2-electronics",
          "children": [
            {
              "name": "Computers",
              "url": "/category/4-computers"
            },
            {
              "name": "Photo",
              "url": "/category/3-photo"
            }
          ]
        }
      ]
    }
    ```
