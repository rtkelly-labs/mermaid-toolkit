# System Architecture

This page demonstrates multi-node flowcharts with vertical orientation (TD) styled according to design system tokens.

```mermaid
graph TD
  User((User)) --> Gateway[API Gateway]
  Gateway --> Auth[Auth Service]
  Gateway --> ServiceA[Catalog Service]
  Gateway --> ServiceB[Order Service]
  ServiceA --> DB1[(Catalog DB)]
  ServiceB --> DB2[(Order DB)]
```

Notice how borders, fonts, surfaces, and accent lines adapt seamlessly to dark mode toggling.
