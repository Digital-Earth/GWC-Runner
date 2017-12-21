var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')

module.exports = {
	entry: [
		'./src/client/main.js'
	],
	output: {
		path: path.resolve(__dirname, './dist'),
		publicPath: '/',
		filename: 'build.js'
	},
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: {
					loaders: {
					}
					// other vue-loader options go here
				}
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
			{
				test: /\.(png|jpg|gif|svg)$/,
				loader: 'file-loader',
				options: {
					name: '[name].[ext]?[hash]'
				}
			},
			{
				test: /\.css$/,
				loader: ['style-loader', 'css-loader']
			},
			{
			test: /\.styl$/,
			loader: ['style-loader', 'css-loader', 'stylus-loader']
			}
		]
	},
	resolve: {
		alias: {
			'vue$': 'vue/dist/vue.esm.js'
		}
	},
	plugins: [
		new webpack.NoEmitOnErrorsPlugin(),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/client/index.html',
			inject: true
		})
	],
	// devServer: {
	// 	historyApiFallback: true,
	// 	// setup: function(app) {
	// 	//   require('./server/setup')(app);
	// 	// },
	// 	noInfo: true
	// },
	performance: {
		hints: false
	},
	devtool: '#eval-source-map'
}

if (process.env.NODE_ENV === 'production') {
	module.exports.devtool = '#source-map'
	// http://vue-loader.vuejs.org/en/workflow/production.html
	module.exports.plugins = (module.exports.plugins || []).concat([
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: '"production"'
			}
		}),
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true,
			compress: {
				warnings: false
			}
		}),
		new webpack.LoaderOptionsPlugin({
			minimize: true
		})
	])
} else {
	module.exports.entry.unshift('webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000');
	module.exports.plugins.unshift(new webpack.HotModuleReplacementPlugin());
	module.exports.plugins.push(new FriendlyErrorsPlugin());		
}
