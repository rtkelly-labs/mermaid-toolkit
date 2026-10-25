# Cloud Architecture

```mermaid
architecture-beta
    group api(cloud)[API Cloud]
    service server(server)[App Server] in api
    service db(database)[Relational DB] in api
    service queue(disk)[Event Queue] in api

    server:R -- L:db
    server:B -- T:queue
```
