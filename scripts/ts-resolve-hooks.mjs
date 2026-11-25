export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await nextResolve(specifier + '.ts', context);
    } catch {
      /* fallback ke resolusi normal */
    }
  }
  return nextResolve(specifier, context);
}
