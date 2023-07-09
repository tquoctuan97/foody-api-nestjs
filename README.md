# Foody API

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Convention

- We use Swagger for REST API documentation.
- Use Nouns in URI: REST API should be designed for resources. For example, instead of `/createUser` use `/users`.
- We prefer to use plurals, but there is no hard rule that one can't use the singular for the resource name.
- Let the HTTP verb define action. Don't misuse safe methods. Use HTTP methods according to the action which needs to be performed.
- Use SSL everywhere, no exceptions.
- Pretty print by default & ensure gzip is supported.
- Always version your API. Version via the URL, not via headers.
- Depict resource [hierarchy](https://hackernoon.com/restful-api-designing-guidelines-the-best-practices-60e1d954e7c9) through URI. If a resource contains sub-resources, make sure to depict this in the API to make it more explicit. `GET /users/123/posts/1`, which will retrieve Post with id 1 by user with id 123.
- Field name casing: make sure the casing convention is consistent across the application. If the request body or response type is JSON, please follow [camelCase](https://en.wikipedia.org/wiki/Camel_case) to maintain the consistency.

## API Version

Always version your API. Version via the URL, not via headers. Versioning APIs always helps to ensure backward compatibility of service while adding new features or updating existing functionality for new clients. The backend will support the old version for a specific amount of time.

- URL: Embed the version in the URL such as `POST /v2/users`.
- Header
  - Custom header: Adding a custom X-API-VERSION header key by the client can be used by a service to route a request to the correct endpoint.
  - Accept header: Using the accept header to specify your version.

## Filter, Search and Sort

Use query parameters for advanced filtering, sorting & searching.

Pagination:

```
GET /companies?page=23&size=50
```

Sort:

```
GET /companies?sort=-created_at
```

Filter:

```
GET /companies?category=software&location=saigon|hanoi
```

Filter by time range:

```
GET /companies?time=fromTime-toTime
```

Search:

```
GET /companies?search=Mckinsey
```

## Batch Delete

- There is no clean `Restful way` to delete a collection of id without any limitation:

  - DELETE method with list of ID in query params is limit by its length (2048 characters)
  - DELETE method doesn't require a BODY, so most of Gateway services ignore the body when direct the request to servers.

- We use a custom `POST` methods to achieve a batch delete functionality:

```
POST /companies/batch_delete

BODY: {
    ids: ["id_1", "id_2"]
}
```

## Auto loading related resource representations

There are many cases where an API consumer needs to load data related to (or referenced from) the resource being requested.

In this case, embed would be a separated list of fields to be embedded. Dot-notation could be used to refer to sub-fields.

```
GET /companies/12?embed=lead.name|assigned_user
```

## Return something useful from POST, PATCH & PUT requests

POST, PUT, or PATCH methods, used to create a resource or update fields in a resource, should always return updated resource representation as a response with appropriate status code as described in further points.

POST, if successful in adding a new resource, should return HTTP status code 201 along with the URI of the newly created resource in the Location header (as per HTTP specification)

## HTTP status codes

HTTP defines a bunch of meaningful status codes that can be returned from your API. These can be leveraged to help the API consumers route their responses accordingly. I've curated a shortlist of the ones that you definitely should be using:

- `200 OK` - Response to a successful GET, PUT, PATCH or DELETE. It can also be used for a POST that doesn't result in creation.
- `201 Created` - Response to a POST that results in a creation. Should be combined with a Location header pointing to the location of the new resource
- `204 No Content` - Response to a successful request that won't be returning a body (like a DELETE request)
- `304 Not Modified` - Used when HTTP caching headers are in play
- `400 Bad Request` - The request is malformed, such as if the body does not parse
- `401 Unauthorized` - When no or invalid authentication details are provided. Also useful to trigger an auth popup if the API is used from a browser
- `403 Forbidden` - When authentication succeeded but the authenticated user doesn't have access to the resource
- `404 Not Found` - When a non-existent resource is requested
- `405 Method Not Allowed` - When an HTTP method is being requested that isn't allowed for the authenticated user
- `410 Gone` - Indicates that the resource at this endpoint is no longer available. Useful as a blanket response for old API versions
- `415 Unsupported Media Type` - If the incorrect content type was provided as part of the request
- `422 Unprocessable Entity` - Used for validation errors
- `429 Too Many Requests` - When a request is rejected due to rate limiting

## Response

Single data entry response

```json
{
  "id": 1,
  "name": "Store",
  "slug": "store"
}
```

Multi data entries or array

```json
{
  "data": [],
  "metadata": {
    "pageSize": 20,
    "currentPage": 2,
    "totalPages": 15,
    "totalCount": 295,
    "hasNextPage": true
  }
}
```

## Error

A JSON error body should provide a few things for the developer - a useful error message, a unique error code (that can be looked up for more details in the docs), and possibly detailed description.

```json
{
  "data": null,
  "error": {
    "status": "", // HTTP status
    "name": "", // error name ('ApplicationError' or 'ValidationError')
    "message": "", // A human readable error message
    "details": {
      // error info specific to the error type
    }
  }
}
```
