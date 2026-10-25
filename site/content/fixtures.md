# Foundational Fixtures Gallery

This gallery compiles foundational Mermaid diagram types using `@rtkelly-labs/mermaid-toolkit` with static Pele SVG compilation and accessible ASCII fallbacks.

## 1. Structural: C4 Architecture

```mermaid
C4Context
    title Banking System Context Diagram
    Person(customer, "Banking Customer", "A customer of the bank with personal accounts.")
    System(bankingSystem, "Internet Banking System", "Allows customers to view information about accounts and make payments.")
    System_Ext(mailSystem, "E-mail System", "The internal Microsoft Exchange e-mail system.")

    Rel(customer, bankingSystem, "Uses", "HTTPS")
    Rel(bankingSystem, mailSystem, "Sends e-mails using", "SMTP")
```

## 2. Behavioral: State Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PendingPayment
    PendingPayment --> Processing : Payment Authorized
    state Processing {
        [*] --> Packing
        Packing --> ReadyForPickup
        ReadyForPickup --> [*]
    }
    Processing --> Shipped : Carrier Handshake
    Shipped --> Delivered : Delivered
    Delivered --> [*]
```

## 3. Schema & Knowledge: Entity-Relationship

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        uuid id PK
        string email
    }
    ORDER {
        uuid id PK
        string status
    }
    LINE-ITEM {
        uuid id PK
        int quantity
    }
```

## 4. Visual Analytics: Quarterly Revenue (XYChart)

```mermaid
xychart-beta
    title "Revenue Growth by Quarter"
    x-axis ["Q1", "Q2", "Q3", "Q4"]
    y-axis "USD Millions" 0 --> 50
    bar [12, 18, 25, 34]
    line [8, 11, 14, 19]
```

## 5. Developer Tooling: Git Graph

```mermaid
gitGraph
    commit id: "Initial Commit"
    branch develop
    checkout develop
    commit id: "Feature A"
    checkout main
    merge develop id: "Release v1.0.0"
```
