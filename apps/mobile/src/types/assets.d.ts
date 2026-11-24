// Metro resuelve las imágenes importadas a un id numérico de asset.
declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}
