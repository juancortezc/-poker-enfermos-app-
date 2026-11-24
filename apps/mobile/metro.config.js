const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './src/global.css' });

// expo-router carga expo-symbols (peer opcional) solo para NativeTabs, que la
// app no usa: la barra es JS con Ionicons. Sin este corte, en Android el
// bundle arrastra la fuente MaterialSymbols (~1 MB). Si algún día se usan
// NativeTabs o SymbolView, hay que quitar esto.
const STUBBED = new Set(['expo-symbols']);
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (STUBBED.has(moduleName)) return { type: 'empty' };
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
