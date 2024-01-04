const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const postcssNormalize = require('postcss-normalize')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const postcssConfig = {
  loader: 'postcss-loader',
  options: {
    postcssOptions: {
      ident: 'postcss',
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    },
    sourceMap: true,
  },
}
module.exports = (env) => {
  const isProduction = env.production

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.tsx',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    optimization: {
      minimize: false,
    },
    plugins: [
      new MiniCssExtractPlugin(),
      new ReactRefreshWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
      }),
      // new BundleAnalyzerPlugin()
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      historyApiFallback: true,
      compress: true,
      port: 3000,
      allowedHosts: ['localhost', '127.0.0.1'],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                plugins: [require.resolve('react-refresh/babel')].filter(
                  Boolean
                ),
              },
            },
          ],
        },
        { test: /\.ts|.tsx$/, exclude: /node_modules/, use: ['ts-loader'] },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', postcssConfig],
        },
        {
          test: /\.s[ac]ss$/i,
          use: ['style-loader', 'css-loader', postcssConfig, 'sass-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'],
    },
    devtool: isProduction ? false : 'inline-source-map',
  }
}
