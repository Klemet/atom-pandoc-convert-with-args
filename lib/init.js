"use babel"

import { existsSync } from 'fs'
import { CompositeDisposable } from 'atom'
import { execFile } from 'child_process'
import { dirname } from 'path'
import pandocBin from 'pandoc-bin'
import targets from './targets'
import quickInput from 'atom-quick-input'

const {
  commands,
  config,
  notifications,
  workspace
} = atom

const cache = {}

module.exports = {

  config: {
    pandocBinary: {
      description: 'Path to your `pandoc` binary. Default is the packaged version of pandoc.',
      type: 'string',
      default: ''
    },
    pandocArguments: {
      description: '`pandoc` command line arguments.',
      type: 'string',
      default: ''
    }
  },

  activate() {
    if (atom.inDevMode() && !atom.inSpecMode()) {
      console.log('activate pandoc-convert')
    }

    this.subscriptions = new CompositeDisposable()

    Object.keys(targets).forEach(target => {
      const action = `pandoc-convert:${target.replace(/_/g, '-')}`

      this.subscriptions.add(commands.add('atom-workspace', action, () => {
        this.convertCommand(target)
      }))
    })
  },

  deactivate() {
    this.subscriptions.dispose()
  },

  convertCommand(target) {
    const editor = workspace.getActiveTextEditor()

    if (!editor) {
      return this.error(`Current item is not an editor.`)
    }

    if (editor.isModified() || !editor.getPath()) {
      return this.error(`Text is modified. Please safe first.`)
    }

    const format = targets[target].format || target
    const ext = targets[target].ext
    const dpath = this.defaultOuputPath(ext)
    const ipath = editor.getPath()

    quickInput(dpath).then((opath) => {
      if (opath) {
        cache[dpath] = opath
        this.convert(format, ipath, opath)
      }
    })
  },

  error(message) {
    notifications.addError(`[pandoc-convert]<br>${message}`)
  },

  success(message) {
    notifications.addSuccess(`[pandoc-convert]<br>${message}`)
  },

  convert(format, ipath, opath) {

    const pandocPath = config.get('pandoc-convert.pandocBinary') || pandocBin.path

    if (!existsSync(pandocPath)) {
      return this.error(`Binary \`${pandocPath}\` does not exist.`)
    }

    const cwd = dirname(ipath)

    const pandocArguments = config.get('pandoc-convert.pandocArguments')
    var pandocArgumentsArray = pandocArguments.split(' ');

      execFile(pandocPath, [
        '--standalone',
        `--to=${format}`,
        `--output=${opath}`,
        ipath
      ].concat(pandocArgumentsArray), { cwd }, (error) => {
      if (error) {
        this.error(error.message)
      } else {
        this.success(`**Created:** \`${opath}\``)
      }
    })
  },

  defaultOuputPath(ext) {
    const editor = workspace.getActiveTextEditor()
    const dpath = `${editor.getPath()}.${ext}`

    if (cache[dpath]) {
      return cache[dpath]
    }

    return dpath
  }
}
