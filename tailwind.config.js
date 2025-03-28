/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/views/**/*.ejs',
		'./src/assets/src/**/*.scss',
		'./src/assets/src/**/*.css',
		'./src/assets/src/**/*.vue',
	],
	theme: {
		container: {
			center: true,
		},
		screens: {
			xl: {max: '1200px'},
			lg: {max: '1024px'},
			md: {max: '768px'},
			sm: {max: '475px'},
			xs: {max: '375px'},
			xxs: {max: '320px'},
		},
		extend: {
			colors: {
				fa_fa: '#fafafa'
			},
		},
	},
	plugins: [],
	darkMode: 'class',
}
