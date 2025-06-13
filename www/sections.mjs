///////////////////////////////////////////////////////////////////////////////

// Now you can call it whenever you need to
//document.addEventListener('DOMContentLoaded', wrapContentInSections)

///////////////////////////////////////////////////////////////////////////////

/*-*- mode: js; js-indent-level: 2 -*-*/
// Copyright 2025 by zrajm. Licenses: CC BY-SA (text), GPLv2 (code).

const isHeading = (element) => element.tagName?.match(/^H[1-6]$/)
const getHeadingLevel = (heading) => parseInt(heading.tagName.substring(1))

// Recursive function to process content
const processNodes = (nodes, parentSection = null) => {
  let processedUntilIndex = 0

  nodes.reduce((acc, node, index) => {

    console.log('ACC:', acc, node, index)

    if (index < processedUntilIndex) { return acc }

    let currentSection = acc.currentSection

    if (isHeading(node)) {
      const headingLevel = getHeadingLevel(node)

      if (parentSection && headingLevel <= getHeadingLevel(parentSection.firstElementChild)) {
        processedUntilIndex = index
        return { currentSection }
      }
      const newSection = document.createElement('section')
      node.parentNode.insertBefore(newSection, node)
      newSection.appendChild(node)
      currentSection = newSection

      const sectionContent = nodes.slice(index + 1).reduce((contentAcc, nextNode, nextIndex) => {
        if (contentAcc.stop) return contentAcc

        if (isHeading(nextNode)) {
          const nextHeadingLevel = getHeadingLevel(nextNode)
          if (nextHeadingLevel <= headingLevel) {
            contentAcc.stop = true
            return contentAcc
          }
        }
        contentAcc.nodes.push(nextNode)
        contentAcc.lastNodeIndex = index + 1 + nextIndex
        return contentAcc
      }, { nodes: [], stop: false, lastNodeIndex: index })

      sectionContent.nodes.forEach(contentNode => {
        currentSection.appendChild(contentNode)
      })

      processNodes(Array.from(currentSection.children).slice(1), currentSection)

      processedUntilIndex = sectionContent.lastNodeIndex + 1
      return { currentSection }

    } else if (node.tagName === 'FOOTER') {
      processedUntilIndex = nodes.length
      return { currentSection }

    } else {
      if (currentSection) {
        currentSection.appendChild(node)
      }
      processedUntilIndex = index + 1
      return { currentSection }
    }
  }, { currentSection: parentSection })
}

export const wrapContentInSections = () => {
  const bodyChildren = Array.from(document.body.children),
    firstHeadingIndex = bodyChildren.findIndex(isHeading),
    nodesToProcess = firstHeadingIndex !== -1 ? bodyChildren.slice(firstHeadingIndex) : []

  console.log('ACC:', nodesToProcess)
  processNodes(nodesToProcess)
}

//[eof]
