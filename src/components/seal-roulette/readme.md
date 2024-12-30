# seal-roulette



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description                           | Type                | Default                                                            |
| ------------- | -------------- | ------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `arcs`        | --             | The arcs of the wheel                 | `SealRouletteArc[]` | `[{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }]` |
| `frictionAir` | `friction-air` | The air friction applied to the wheel | `number`            | `0.15`                                                             |
| `radius`      | `radius`       | The radius of the wheel               | `number`            | `256`                                                              |


## Events

| Event      | Description                           | Type                                     |
| ---------- | ------------------------------------- | ---------------------------------------- |
| `spinning` | Emitted when the wheel is spinning    | `CustomEvent<void>`                      |
| `stopped`  | Emitted when the wheel stops spinning | `CustomEvent<[number, SealRouletteArc]>` |


## Methods

### `spin(force?: number) => Promise<void>`



#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `force` | `number` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
