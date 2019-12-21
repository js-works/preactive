// TODO - fix that uglify vs terser issue
const
  CleanupPlugin = require('webpack-cleanup-plugin'),
  UglifyJsPlugin = require('uglifyjs-webpack-plugin'),
  TerserPlugin = require('terser-webpack-plugin'),
  CompressionPlugin = require('compression-webpack-plugin'),
  ZipPlugin = require('zip-webpack-plugin'),
  path = require('path'),

  libraryTargetMap = {
    cjs: 'commonjs2',
    umd: 'umd',
    esm: 'commonjs-module'
  }

const configs = []

for (const moduleType of ['cjs', 'umd', 'esm']) {
  for (const environment of ['development', 'production']) {
    // TODO - this is aweful - fix it
    configs.push(createConfig(moduleType, environment, !configs, !configs))
  }
}

module.exports = configs

function createConfig(moduleType, environment, cleanup = false, zip = false) {
  const isProd = environment === 'production'

  return {
    entry: `./src/main/index.js`,
    mode: environment,

    output: {
      library: 'preactive',
      libraryTarget:  libraryTargetMap[moduleType],
      path: path.resolve(__dirname, 'dist'),
      filename: `preactive.${moduleType}.${environment}.js`
    },

    externals: ['preact', 'preact/hooks', 'js-spec', 'js-spec/validators'],

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',

          options: {
            presets: [
              ['@babel/preset-env']
            ]
          }
        }
      ]
    },

    plugins: [
      ...(!cleanup ? [] : [new CleanupPlugin()]),
      ...(!isProd ? [] : [new CompressionPlugin()]),

      ...(!zip ? [] : [
        new ZipPlugin({
          filename: 'source.zip',
          exclude: ['node_modules', '.git', 'dist'],
        })
      ])
    ],

    optimization: {
      minimize: true,
      
      minimizer: [
        new TerserPlugin({
          extractComments: false,

          terserOptions: {
            output: {
              comments: false
            }
          }
        })
      ]
      
      //new UglifyJsPlugin()
    }
  }
}
