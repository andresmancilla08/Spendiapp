// Los iconos se importan uno a uno desde `dist/esm/icons/…` en vez de por el
// barril: Metro no hace tree-shaking y con `from '@tabler/icons-react-native'`
// viajaban los ~5.900 iconos del paquete (4,5 MB de los 8 MB del bundle web).
// El paquete no publica declaraciones por icono, así que las damos aquí.
declare module '@tabler/icons-react-native/dist/esm/icons/*' {
  import type { Icon } from '@tabler/icons-react-native';
  const icon: Icon;
  export default icon;
}
