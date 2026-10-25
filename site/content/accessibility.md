# Accessibility & Screen Reader Fallbacks

Visual diagrams are often completely inaccessible to screen readers and text-only browsers.

By using `strategy: 'both'`, our MDX plugin automatically pairs the static SVG with a collapsible `<details>` text diagram:

```mermaid
graph LR
  Draft[Draft Post] --> Review[Editorial Review]
  Review --> Approved{Approved?}
  Approved -->|Yes| Publish[Published]
  Approved -->|No| Revisions[Author Revisions]
  Revisions --> Review
```

Click the "Text version" dropdown below the diagram to inspect the plain-text box-drawing alternative.
