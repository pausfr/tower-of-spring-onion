import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// build 결과를 html 파일 하나로 합쳐서 더블클릭만으로 열 수 있게 한다.
export default defineConfig({ plugins: [viteSingleFile()] })
