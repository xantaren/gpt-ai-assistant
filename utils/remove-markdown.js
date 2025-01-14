/**
 * Copyright (c) 2015 Stian Grytøyr.
 * Licensed under the MIT License.
 * Original Source: https://github.com/zuchka/remove-markdown
 */
const removeMarkdown = (md, options = {}) => {
    options = {
        gfm: true,
        htmlTagsToSkip: ['.*'],
        abbr: false,
        replaceLinksWithURL: false,
        useImgAltText: false,
        preserveCodeBlocks: true,
        ...options
    };

    if (!md) return '';

    // Store code blocks temporarily with a unique identifier that won't appear in normal text
    const codeBlocks = [];
    const CODE_BLOCK_PLACEHOLDER = '|||CODEBLOCK|||';
    let output = md;

    if (options.preserveCodeBlocks) {
        // Handle fenced code blocks (```language\ncode```)
        output = output.replace(/```[\s\S]+?```/g, (match) => {
            codeBlocks.push(match);
            return `${CODE_BLOCK_PLACEHOLDER}${codeBlocks.length - 1}${CODE_BLOCK_PLACEHOLDER}`;
        });
    }

    // Remove horizontal rules
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
                // Strikethrough
                .replace(/~~/g, '');

            // Don't process code blocks if we're preserving them
            if (!options.preserveCodeBlocks) {
                output = output
                    .replace(/~{3}.*\n/g, '')
                    .replace(/`{3}.*\n/g, '');
            }
        }

        if (options.abbr) {
            output = output.replace(/\*\[.*\]:.*\n/, '');
        }

        let htmlReplaceRegex = /<[^>]*>/g;
        if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
            const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|');
            htmlReplaceRegex = new RegExp(
                `<(?!\/?(${joinedHtmlTagsToSkip})(?=>|\s[^>]*>))[^>]*>`,
                'g',
            );
        }

        output = output
            // Remove HTML tags
            .replace(htmlReplaceRegex, '')
            // Remove setext-style headers
            .replace(/^[=\-]{2,}\s*$/g, '')
            // Remove footnotes
            .replace(/\[\^.+?\](\: .*?$)?/g, '')
            .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
            // Remove images
            .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
            // Remove inline links
            .replace(/\[([^\]]*?)\][\[\(].*?[\]\)]/g, options.replaceLinksWithURL ? '$2' : '$1')
            // Remove blockquotes
            .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
            // Remove reference-style links
            .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
            // Remove atx-style headers
            .replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6')
            // Remove emphasis
            .replace(/([\*]+)(\S)(.*?\S)??\1/g, '$2$3')
            .replace(/(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5')
            // Remove inline code (but not code blocks)
            .replace(/`([^`]+)`/g, '$1')
            // Replace strike through
            .replace(/~(.*?)~/g, '$1');

        // Restore code blocks
        if (options.preserveCodeBlocks) {
            codeBlocks.forEach((block, index) => {
                const placeholder = `${CODE_BLOCK_PLACEHOLDER}${index}${CODE_BLOCK_PLACEHOLDER}`;
                output = output.replace(placeholder, block);
            });
        }

    } catch(e) {
        if (options.throwError) throw e;
        console.error("remove-markdown encountered error:", e);
        return md;
    }

    // Clean up any remaining markdown-style formatting
    output = output
        // Clean up extra whitespace
        .replace(/\n\s+\n/g, '\n\n')
        // Remove extra newlines
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return output;
};

export default removeMarkdown;
