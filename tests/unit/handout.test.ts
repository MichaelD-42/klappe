import { expect, test } from 'vitest'
import { handoutPage } from '../../bin/pdf.mjs'

// A handout page: the scene's last step as a picture, its title, then the scene's and the steps' notes in order.
test('a handout page has the picture, the title and the notes in order, as text', () => {
  const html = handoutPage({ shot: 'AAAA', title: 'Costs <2025>', notes: ['Open with the number.', 'Then the "why".\n\nPause.'] })
  expect(html).toContain('src="data:image/jpeg;base64,AAAA"')
  expect(html).toContain('<h2>Costs &lt;2025&gt;</h2>')
  expect(html.indexOf('Open with the number.')).toBeLessThan(html.indexOf('Then the &quot;why&quot;.'))
  expect(html).toContain('<p>Pause.</p>')
})

test('a scene without notes gets no notes block', () => {
  expect(handoutPage({ shot: 'AAAA', title: 'T', notes: [] })).not.toContain('<p>')
})
