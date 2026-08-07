import { colors } from "../constants";

// Must use {{{ genreToIcon genre }}} in the Handlebars template to avoid escaping the HTML
export const genreToIcon = function (
  genre: string,
  on: boolean = true,
  addClasses: string = ""
): Handlebars.SafeString {
  return new Handlebars.SafeString(
    `<i class="fa-solid ${colors[genre]?.fa} ${addClasses}" style="color:${
      on ? colors[genre]?.on : colors[genre]?.off
    };"></i>`
  );
};
