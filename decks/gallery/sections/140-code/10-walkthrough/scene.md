## Code walkthrough

> Use a code walkthrough to explain a function one part at a time.

```js {1-2|3-5|6}
function total(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
}
```

- A fenced block with {1-2|3-5|6} in scene.md: each group focuses its lines, one step each
- The loop adds each price.
- The function returns the sum.
