import { convert } from '../convert'
import { normalize } from '../helpers'

it('flatten nested global', () => {
  const scss = normalize(`
    :global {
      .first {
        color: blue;
        &-second {
          color: red;
          &-third {
            color: green;
            &-forth {
              color: blue;
            }
          }
        }
      }
    }
  `)
  const emotion = convert(scss, 'flatten-nested-global.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    // tslint:disable-next-line no-unused-expression
    injectGlobal\`
      .first {
        color: blue;
      }
      .first-second {
        color: red;
      }
      .first-second-third {
        color: green;
      }
      .first-second-third-forth {
        color: blue;
      }
    \`
  `))
})

it('flatten nested local', () => {
  const scss = normalize(`
    .first {
      color: blue;
      &-second {
        color: red;
        &-third {
          color: green;
          &-forth {
            color: blue;
          }
        }
      }
    }
  `)
  const emotion = convert(scss, 'flatten-nested-global.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    export const first = css\`
      color: blue;
    \`

    export const firstSecond = css\`
      color: red;
    \`

    export const firstSecondThird = css\`
      color: green;
    \`

    export const firstSecondThirdForth = css\`
      color: blue;
    \`
  `))
})

it('not flatten nested pseudo', () => {
  const scss = normalize(`
    .foo {
      color: blue;
      &:hover {
        color: red;
        &:hover:disabled {
          color: green;
        }
      }
      &:hover form {
        color: yellow;
      }
    }
  `)
  const emotion = convert(scss, 'not-flatten-nested-pseudo.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    export const foo = css\`
      color: blue;
      &:hover {
        color: red;
        &:hover:disabled {
          color: green;
        }
      }
      &:hover form {
        color: yellow;
      }
    \`
  `))
})

it('nested element selector', () => {
  const scss = normalize(`
    .foo {
      color: red;
      svg {
        color: blue;
      }
    }
  `)
  const emotion = convert(scss, 'nested-element-selector.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    export const foo = css\`
      color: red;
      svg {
        color: blue;
      }
    \`
  `))
})

it('nested wildcard selector', () => {
  const scss = normalize(`
    .foo {
      color: red;
      * {
        color: blue;
      }
    }
  `)
  const emotion = convert(scss, 'nested-wildcard-selector.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    export const foo = css\`
      color: red;
      * {
        color: blue;
      }
    \`
  `))
})

it('convert scss variables to javascript variables', () => {
  const scss = normalize(`
    $first-var: red;

    .foo {
      color: $first-var;
      $second-var: blue;
      &-bar {
        color: $second-var;
      }
    }

    :global {
      $third-var: green;
      .apple {
        color: $third-var;
      }
    }
  `)
  const emotion = convert(scss, 'convert-scss-variables-to-javascript-variables.scss')
  expect(emotion).toBe(normalize(`
    import { css, injectGlobal } from 'emotion'

    // TODO \${firstVar}: red;

    export const foo = css\`
      color: \${firstVar};
    \`

    // tslint:disable-next-line no-unused-expression
    injectGlobal\`
      .apple {
        color: \${thirdVar};
      }
    \`

    // TODO \${secondVar}: blue;

    export const fooBar = css\`
      color: \${secondVar};
    \`

    // TODO \${thirdVar}: green;
  `))
})

