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
    configs.push(createConfig(moduleType, environment))
  }
}

module.exports = configs

function createConfig(moduleType, environment) {
  const isProd = environment === 'production'

  return {
    entry: `./src/main/index.js`,
    mode: environment,

    output: {
      library: 'jsPreactive',
      libraryTarget:  libraryTargetMap[moduleType],
      path: path.resolve(__dirname, 'dist'),
      filename: `js-preactive.${moduleType}.${environment}.js`
    },

    externals:  environment === 'development'
      ? ['preact']
      : ['preact', 'js-spec', 'js-spec/validators'],

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
      ...(!isProd ? [] : [new CompressionPlugin()]),
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
