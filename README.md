# Cancellation Token

Cancellation tokens are composable entities that allow cancelling asynchronous operations.

[![npm](https://img.shields.io/npm/v/cancellationtoken.svg?style=flat-square)](https://www.npmjs.com/package/cancellationtoken)

The implementation roughly follows these TC39 proposals:
- https://github.com/tc39/proposal-cancellation
- https://github.com/tc39/proposal-cancelable-promises

The implementation is written in TypeScript and therefore comes with typings already bundled.

## Installation

Install the library via your favourite package manager.

```
npm install cancellationtoken --save
```
or
```
yarn add cancellationtoken
```

## Usage

You can create a new cancellation token along with a function to cancel it via `create`. Functions can consume tokens by accessing the `ìsCancelled` property.

```
import CancellationToken from 'cancellationtoken'

const { cancel, token } = CancellationToken.create()
console.log(token.isCancelled) // prints false
cancel()
console.log(token.isCancelled) // prints true
```

## Documentation

Coming soon! Meanwhile you can use the TypeScript definitions.

## Examples

For usage examples have a look at the `examples/` directory.

```
cd examples/
npm install
npm run example 01-tutorial
npm run example <name>
```
or
```
cd examples/
yarn
yarn run example 01-tutorial
yarn run example <name>
```
