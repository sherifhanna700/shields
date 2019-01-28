import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import pathToRegexp from 'path-to-regexp'
import humanizeString from 'humanize-string'
import { patternToOptions } from '../../lib/pattern-helpers'
import { noAutocorrect, StyledInput } from '../common'
import {
  BuilderContainer,
  BuilderLabel,
  BuilderCaption,
} from './builder-common'

const PathBuilderColumn = styled.span`
  height: 78px;

  float: left;
  display: flex;
  flex-direction: column;

  margin: 0;

  ${({ withHorizPadding }) =>
    withHorizPadding &&
    css`
      padding: 0 8px;
    `};
`

const PathLiteral = styled.div`
  margin-top: 32px;
  ${({ isFirstToken }) =>
    isFirstToken &&
    css`
      margin-left: 3px;
    `};
`

const NamedParamLabelContainer = styled.span`
  display: flex;
  flex-direction: column;
  height: 32px;
  width: 100%;
  justify-content: center;
`

const inputStyling = `
  width: 100%;
  text-align: center;

  margin-bottom: 10px;
`

const NamedParamInput = styled(StyledInput)`
  ${inputStyling}
`

// -1px to align with input boxes alongside.
const NamedParamSelect = styled.select`
  ${inputStyling}
  margin-top: -2px;
`

const NamedParamCaption = styled(BuilderCaption)`
  width: 100%;
  text-align: center;
`

export default class PathBuilder extends React.Component {
  static propTypes = {
    pattern: PropTypes.string.isRequired,
    exampleParams: PropTypes.object.isRequired,
    onChange: PropTypes.func,
  }

  constructor(props) {
    super(props)

    const { pattern } = props
    const tokens = pathToRegexp.parse(pattern)

    const namedParams = {}

    // `pathToRegexp.parse()` returns a mixed array of strings for literals
    // and  objects for parameters. Filter out the literals and work with the
    // objects.
    tokens
      .filter(t => typeof t !== 'string')
      .forEach(({ name }) => {
        namedParams[name] = ''
      })

    this.state = {
      tokens,
      namedParams,
    }
  }

  static constructPath({ tokens, namedParams }) {
    let isComplete = true
    const path = tokens
      .map(token => {
        if (typeof token === 'string') {
          return token
        } else {
          const { delimiter, name, optional } = token
          let value = namedParams[name]
          if (value) {
            return `${delimiter}${value}`
          } else if (optional) {
            return ''
          } else {
            isComplete = false
            return `${delimiter}:${name}`
          }
        }
      })
      .join('')
    return { path, isComplete }
  }

  getPath(namedParams) {
    const { tokens } = this.state
    return this.constructor.constructPath({ tokens, namedParams })
  }

  handleTokenChange = evt => {
    const { name, value } = evt.target
    const { namedParams: oldNamedParams } = this.state

    const namedParams = {
      ...oldNamedParams,
      [name]: value,
    }

    this.setState({ namedParams })

    const { onChange } = this.props
    if (onChange) {
      const { path, isComplete } = this.getPath(namedParams)
      onChange({ path, isComplete })
    }
  }

  renderLiteral(literal, tokenIndex) {
    return (
      <PathBuilderColumn key={`${tokenIndex}-${literal}`}>
        <PathLiteral isFirstToken={tokenIndex === 0}>{literal}</PathLiteral>
      </PathBuilderColumn>
    )
  }

  renderNamedParamInput(token) {
    const { name, pattern } = token
    const options = patternToOptions(pattern)

    const { namedParams } = this.state
    const value = namedParams[name]

    if (options) {
      return (
        <NamedParamSelect
          name={name}
          value={value}
          onChange={this.handleTokenChange}
        >
          <option key="empty" value="">
            {' '}
          </option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NamedParamSelect>
      )
    } else {
      return (
        <NamedParamInput
          type="text"
          name={name}
          value={value}
          onChange={this.handleTokenChange}
          {...noAutocorrect}
        />
      )
    }
  }

  renderNamedParam(token, tokenIndex, namedParamIndex) {
    const { delimiter, name, optional } = token

    const { exampleParams } = this.props
    const exampleValue = exampleParams[name] || '(not set)'

    return (
      <React.Fragment key={token.name}>
        {this.renderLiteral(delimiter, tokenIndex)}
        <PathBuilderColumn withHorizPadding>
          <NamedParamLabelContainer>
            <BuilderLabel htmlFor={name}>{humanizeString(name)}</BuilderLabel>
            {optional ? <BuilderLabel>(optional)</BuilderLabel> : null}
          </NamedParamLabelContainer>
          {this.renderNamedParamInput(token)}
          <NamedParamCaption>
            {namedParamIndex === 0 ? `e.g. ${exampleValue}` : exampleValue}
          </NamedParamCaption>
        </PathBuilderColumn>
      </React.Fragment>
    )
  }

  render() {
    const { tokens } = this.state
    let namedParamIndex = 0
    return (
      <BuilderContainer>
        {tokens.map((token, tokenIndex) =>
          typeof token === 'string'
            ? this.renderLiteral(token, tokenIndex)
            : this.renderNamedParam(token, tokenIndex, namedParamIndex++)
        )}
      </BuilderContainer>
    )
  }
}
