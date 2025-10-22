/*-*- js-indent-level: 2 -*-*/
// Copyright 2025 by zrajm. Licenses: CC BY-SA (text), GPLv2 (code).

import { $ } from '/elemental/elemental.mjs'
import { quotecurl } from '/quotecurl/quotecurl.mjs'

// Load Baremark modules (in order).
// FIXME: Strictly sequential loading of modules is inefficient. Fix?
importFiles(
  replaceCSS,
  addScrollToTopButton,
  '/baremark/addon/table.js',
  '/baremark/addon/sup.js',
  '/baremark/addon/autolink.js',
  '/baremark/addon/id.js',                     // '[#…]' BEFORE toc & metadata
  '/baremark/addon/meta.js',
  '/baremark/addon/toc.js',
  pageMain)

/******************************************************************************/

// Scroll-to-top button (shown below fold).
function addScrollToTopButton() {
  const [btn] = $(
    `<a href=#><svg width="24" height="24" viewBox="0 0 12 12">`
      + `<path fill="none" stroke="#fff" d="M6 12V3M2 7l4-4 4 4"/></svg></a>`
  ).css({
    position: 'fixed',
    bottom: '-60px',
    right: '20px',
    width: '48px',
    height: '48px',
    background: '#444', opacity: '.7',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'bottom .25s ease, box-shadow .25s ease-in-out',
    zIndex: '9999',
  })
  const [fold] = $('<div>').css({
    position: 'absolute',
    inset: '0',  // 1st screenful
    zIndex: '-9999',
    pointerEvents: 'none',
  })
  $(document.body).append(fold, btn)
  new IntersectionObserver(([fold]) => {
    btn.style.bottom = fold.isIntersecting ? '-60px' : '20px'
  }).observe(fold)
}

// Load stylesheet, remove old when page is fully loaded.
function replaceCSS() {
  const oldStyle = $('link[rel="stylesheet"]')
  $('head').append(
    $(`<link rel=stylesheet href=${import.meta.resolve('./scent.css')}>`))
  $(document).on('scent:done', () => oldStyle.remove())
}

// Return class string as-is if a neededClass was found, or with the first
// neededClass appended if no neededClass was found.
function ensureClass(classStr = '', neededStr = '') {
  const trimsplit = x => (x = x.trim(), x ? x.split(/\s+/) : [])
  const classes = trimsplit( classStr)
  const needed  = trimsplit(neededStr)
  const [first] = needed
  return [
    ...classes,
    ...classes.some(x => needed.includes(x)) ? [] : [first],
  ].join(' ')
}

function pageMain() {
  window.$ = $                                 // for use in browser console

  // Get & process markdown.
  const [textarea] = $('textarea')
  const htmlContent = baremark(textarea?.value ?? '')
    .replace(/\b(FIXME|TODO)\b/g, '<mark>$1</mark>')

  // Set some metadata defaults.
  const meta = (meta => ({
    lang    :              'en-GB',         //   (UK locale has '1 May 2025'
    title   :              '[NO TITLE]',    //     instead of 'May 1, 2025')
    created : meta.date ?? '',
    years   : uniq([meta.created, meta.updated]
                   .flatMap(x => /\b[0-9]{4}\b/.exec(x) ?? [])).join('–'),
    favicon : '/favicon.svg',
    ...meta,
    // Add 'book' unless indent class already present.
    class   : ensureClass(meta.class, 'book hanging blank')
  }))(baremark.meta)                           // read from markdown

  $('html')
    .attr({ lang: meta.lang })
    .addClass(meta.class)
    .append('<input id=darkmode type=checkbox>')
    .addClass(/\bDEBUG\b/i.test(location.search) ? 'DEBUG' : '')

  $('head').append(htmlMeta(meta))             // get & add metadata to <head>

  // Replace <textarea> with page content.
  textarea.outerHTML = '<main>' + htmlTitle(meta) + htmlContent + '</main>'
    + htmlFooter(meta)

  // Make quotes curly in all text elements in DOM.
  modifyTextNodes(node => node.data = quotecurl(node.data))

  // Add 'target="_blank"' to all external links.
  $('a[href]:not([href^="#"],[href^="javascript:"])').attr({ target: '_blank' })

  insertOptionalBreakAfterSlash()
  wrapChapters()

  // Add class 'onelink' to table cells which contains exactly one link.
  $('td, th').forEach(td => {
    const $td = $(td)
    if ($td.find('a[href]').length === 1) {
      $td.addClass('onelink')
    }
  })

  // If page has finished redraw, and is at top of page (= user hasn't scrolled
  // down), jump #hash fragment in URL (if there is one).
  setTimeout(() => {
    if (location.hash && scrollY === 0) {
      location.href = location.hash
    }
  }, 100)

  document.dispatchEvent(new Event('scent:done'))
}

// Uniquify values in list.
function uniq(arr) {
 return arr.filter((x, i, arr) => arr.indexOf(x) === i)
}

// Process all text nodes in the DOM.
function modifyTextNodes(func, node = document.body) {
  switch (node.nodeType) {
    case Node.TEXT_NODE: func(node); return
    case Node.ELEMENT_NODE: switch (node.tagName) {
      // These tags shouldn't be processed.
      case 'PRE': case 'SCRIPT': case 'STYLE': case 'SVG': case 'TT': return
    }
  }
  for (const child of node.childNodes) { modifyTextNodes(func, child) }
}

// Load modules & run functions, in order.
//
// Args are names of modules to load (strings) or functions to run. Modules
// will be loaded sequentially (inefficient, but guaranteed order), and any
// function will be run instead of loading a function.
function importFiles(fileOrFunc, ...tail) {
  if (!fileOrFunc) { return }                  // no args = we're done
  if (typeof fileOrFunc === 'function') {      // function = run it
    fileOrFunc()
    return importFiles(...tail)
  }
  import(fileOrFunc).then(() => {              // string = load module
    return importFiles(...tail)
  })
}

// Insert '<wbr>' after '/' in all text nodes, if the word after '/' is five
// letters or longer (this limitation is mostly to not break 'him/her/it/them'
// combinations, which, if it occurs in the first cell of a table, looks really
// ugly).
function insertOptionalBreakAfterSlash(e = document.body) {
  modifyTextNodes(node => {
    const offset = node.data.search(/\/(?=[\p{Letter}\p{Number}]{5})/u)
    if (offset >= 0) {
      const node2 = node.splitText(offset + 1)
      node.parentNode.insertBefore(document.createElement('wbr'), node2)
      insertOptionalBreakAfterSlash(node2)  // process split-off text
    }
  })
}

// Wrap chapters in <div>s, & move `id` attr from the <h#> to the wrapper.
function wrapChapters(selector = 'h6,h5,h4,h3,h2,h1') {
  const [headTag, ...headTags] = selector.split(',')
  // Return tags from <tag> up to (but excluding) 1st tag matching <selector>.
  function chapterContent(tag, selector, tags = [tag]) {
    return ((tag = tag.nextSibling) && tag.nodeType !== 9
            && !(tag.nodeType === 1 && tag.matches(selector)))
      ? chapterContent(tag, selector, tags.concat(tag)) : tags
  }
  // For each tag, wrap it and following text content in <div>.
  $(`${headTag}[id]`).forEach(heading => {
    const { id } = heading; heading.removeAttribute('id')
    heading = heading.closest('hgroup') ?? heading
    const [wrapper] = $('<div>').attr({ id })
    heading.before(wrapper)
    $(wrapper).append(...chapterContent(heading, selector))
  })
  if (headTags.length) { wrapChapters(headTags.join(',')) }
}

// Completely flatten all args, and join them using the first arg as a
// separator.
function flatjoin(sep, ...x) {
  return x.flat(Infinity).filter(x => x).join(sep)
}

// Returns `template` replacing the first `%`, unless `x` is falsey, in which
// case an empty string is returned. If `x` is array, it is flatjoin()ed before
// insertion (using the first element of the array as the separator).
function tmpl(template, x) {
  x = x?.constructor === Array ? flatjoin(...x) : x
  return x ? template.replace('%', x) : ''
}

// Return HTML for page <head>.
function htmlMeta({title, author, years, favicon}) {
  return flatjoin('\n', [
    '<meta name=viewport content=width=device-width,'
      + 'initial-scale=1.0,viewport-fit=cover>',
    tmpl('<link rel=icon href="%" sizes=any>', favicon),
    tmpl('<title>%</title>', [' ', [
      (title ?? '').replace(/<br>/g, ' '),
      tmpl('(%)', [' ', tmpl('© %', years), author])
    ]]),
  ])
}

// Return HTML for page title.
function htmlTitle({title, author, created, updated, lang, titleId}) {
  const quot = (x = '') => x.replace(/"/g, '&quot;')
  const textDate = date => !date ? ''
    : Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(date))
  return flatjoin('\n', [
    '<hgroup>',
    tmpl(`<h1${tmpl(' id="%"', quot(titleId))}>%</h1>`, title),
    tmpl('<p>%</p>', [' ', [
      tmpl('By %', author),
      tmpl('(<time>%</time>)', ['–', textDate(created, lang), textDate(updated, lang)])
    ]]),
    '</hgroup>',
  ])
}

// Return HTML for page <footer>.
function htmlFooter({author, years, license}) {
  return flatjoin('\n', [
    '<footer>',
     flatjoin('<br>', [
       tmpl('© %, Uppsala, Sweden', [' ', [
         tmpl('%', years),
         tmpl('by %', author)
       ]]),
       tmpl('License: %', license),
     ]),
    '</footer>',
  ])
}

//[eof]
