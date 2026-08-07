// `{{#range 1 n}}` repeats its block n times. A context object may be passed as
// a third argument when the block needs more than `index`; Handlebars always
// appends its own options argument last, which is how the two forms are told
// apart.
export const range = function (
  start: number,
  end: number,
  context: any,
  options?: any
) {
  if (options === undefined) {
    options = context;
    context = {};
  }

  let result = "";
  for (let i = start; i <= end; i++) {
    result += options.fn({ ...context, index: i });
  }
  return result;
};
