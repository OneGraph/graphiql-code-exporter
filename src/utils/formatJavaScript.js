import {format} from 'prettier/standalone';
import babylon from 'prettier/parser-babylon';

export default function formatJavaScript(code) {
  return format(code, {
    printWidth: 55,
    semi: false,
    parser: 'babylon',
    plugins: [babylon],
  });
}
