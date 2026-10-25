# State Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PendingPayment
    PendingPayment --> PaymentFailed: Payment Declined
    PaymentFailed --> PendingPayment: Retry Payment
    PaymentFailed --> Cancelled: Timeout (24h)

    PendingPayment --> Processing: Payment Authorized
    
    state Processing {
        [*] --> Packing
        Packing --> LabelGenerated
        LabelGenerated --> ReadyForPickup
        ReadyForPickup --> [*]
    }

    Processing --> Shipped: Carrier Handshake
    Shipped --> Delivered: Customer Signature
    Delivered --> [*]
    Cancelled --> [*]
```
