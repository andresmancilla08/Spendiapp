// Los iconos se importan uno a uno (`@tabler/icons-react-native/IconPlus`) en vez
// de por el barril: Metro no hace tree-shaking y con `from '@tabler/icons-react-native'`
// viajaban los ~5.900 iconos del paquete (4,5 MB de los 8 MB del bundle web).
//
// La declaración de aquí hace falta porque el "exports" del paquete apunta los
// tipos a `./dist/icons/*.d.ts` y los ficheros están un nivel más abajo, en
// `./dist/icons/icons/`. Es un fallo suyo, no nuestro.
declare module '@tabler/icons-react-native/Icon*' {
  import type { Icon } from '@tabler/icons-react-native';
  const icon: Icon;
  export default icon;
}
