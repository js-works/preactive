import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import gzip from "rollup-plugin-gzip";

const configs = [];

for (const format of ["umd", "cjs", "amd", "esm"]) {
  for (const productive of [false, true]) {
    configs.push(createConfig(format, productive));
  }
}

export default configs;

// --- locals -------------------------------------------------------

function createConfig(moduleFormat, productive) {
  return {
    input: `src/main/index.ts`,

    output: {
      file: productive
        ? `dist/js-preactive.${moduleFormat}.production.js`
        : `dist/js-preactive.${moduleFormat}.development.js`,

      format: moduleFormat,
      sourcemap: false, //productive ? false : 'inline',
      name: "jsPreactive",

      globals: {
        preact: "preact",
      },
    },

    external: ["preact"],

    plugins: [
      resolve(),
      commonjs(),
      replace({
        exclude: "node_modules/**",
        delimiters: ["", ""],
        preventAssignment: true,
        values: {
          "process.env.NODE_ENV": productive ? "'production'" : "'development'",
        },
      }),
      typescript({
        exclude: "node_modules/**",
      }),
      productive && terser(),
      productive && gzip(),
    ],
  };
}
