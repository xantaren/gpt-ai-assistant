/**
 * Copyright (c) 2015 Stian Grytøyr.
 * Licensed under the MIT License.
 * Source: https://github.com/zuchka/remove-markdown
 */
const removeMarkdown = (md, options = {}) => {
    options = options || {};
    options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
    options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
    options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
    options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
    options.abbr = options.hasOwnProperty('abbr') ? options.abbr : false;
    options.replaceLinksWithURL = options.hasOwnProperty('replaceLinksWithURL') ? options.replaceLinksWithURL : false;
    options.htmlTagsToSkip = options.hasOwnProperty('htmlTagsToSkip') ? options.htmlTagsToSkip : [];
    options.throwError = options.hasOwnProperty('throwError') ? options.throwError : false;

    var output = md || '';

    // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
    output = output.replace(/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm, '');

    try {
        if (options.stripListLeaders) {
            if (options.listUnicodeChar)
                output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
            else
                output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
        }
        if (options.gfm) {
            output = output
                // Header
                .replace(/\n={2,}/g, '\n')
                // Fenced codeblocks
                .replace(/~{3}.*\n/g, '')
                // Strikethrough
                .replace(/~~/g, '')
                // Fenced codeblocks
                .replace(/`{3}.*\n/g, '');
        }
        if (options.abbr) {
            // Remove abbreviations
            output = output.replace(/\*\[.*\]:.*\n/, '');
        }

        let htmlReplaceRegex = /<[^>]*>/g
        if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
            // Create a regex that matches tags not in htmlTagsToSkip
            const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|')
            htmlReplaceRegex = new RegExp(
                `<(?!\/?(${joinedHtmlTagsToSkip})(?=>|\s[^>]*>))[^>]*>`,
                'g',
            )
        }

        output = output
            // Remove HTML tags
            .replace(htmlReplaceRegex, '')
            // Remove setext-style headers
            .replace(/^[=\-]{2,}\s*$/g, '')
            // Remove footnotes?
            .replace(/\[\^.+?\](\: .*?$)?/g, '')
            .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
            // Remove images
            .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
            // Remove inline links
            .replace(/\[([^\]]*?)\][\[\(].*?[\]\)]/g, options.replaceLinksWithURL ? '$2' : '$1')
            // Remove blockquotes
            .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
            // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
            // Remove reference-style links?
            .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
            // Remove atx-style headers
            .replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6')
            // Remove * emphasis
            .replace(/([\*]+)(\S)(.*?\S)??\1/g, '$2$3')
            // Remove _ emphasis. Unlike *, _ emphasis gets rendered only if
            //   1. Either there is a whitespace character before opening _ and after closing _.
            //   2. Or _ is at the start/end of the string.
            .replace(/(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5')
            // Remove code blocks
            .replace(/(`{3,})(.*?)\1/gm, '$2')
            // Remove inline code
            .replace(/`(.+?)`/g, '$1')
            // // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
            // .replace(/\n{2,}/g, '\n\n')
            // // Remove newlines in a paragraph
            // .replace(/(\S+)\n\s*(\S+)/g, '$1 $2')
            // Replace strike through
            .replace(/~(.*?)~/g, '$1');
    } catch(e) {
        if (options.throwError) throw e;

        console.error("remove-markdown encountered error: %s", e);
        return md;
    }
    return output;
};

export default removeMarkdown;