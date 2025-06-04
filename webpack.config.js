const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  // The entry point for the webview bundle
  entry: './src/webview/app/index.tsx',
  // The output directory for the bundled webview files
  output: {
    path: path.resolve(__dirname, 'out/webview'),
    filename: 'bundle.js',
  },
  // Enable sourcemaps for debugging webpack's output.
  devtool: 'source-map',
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // Add node_modules from the root of the extension to resolve paths
    modules: [
      path.resolve(__dirname, 'node_modules'), // Local node_modules for webview app
      path.resolve(__dirname, '../../node_modules') // Root extension node_modules
    ]
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // All '.css' files will be handled by MiniCssExtractPlugin and css-loader.
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    // Generates an HTML file and injects the bundled JS.
    new HtmlWebpackPlugin({
      template: './src/webview/app/index.html', // Path to your HTML template
      filename: 'index.html', // Output HTML file name
      inject: 'body', // Inject script into the body
    }),
    // Extracts CSS into separate files
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
  ],
  // Keep the bundle small for faster loading in the webview
  performance: {
    hints: false,
  },
};
