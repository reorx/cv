// A detailed skill carries a long summary that would bury the rest of the CV,
// so collapse it behind a toggle. The summary stays in the DOM: print styles in
// index.scss expand it again, and without this script it simply renders as usual.
const TOGGLE_LABEL = 'My opinion'

document.querySelectorAll('.skill.-detailed').forEach((skill, index) => {
  const summary = skill.querySelector('.summary')
  if (!summary) return

  summary.id = `detailed-skill-summary-${index}`

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'summary-toggle'
  toggle.textContent = TOGGLE_LABEL
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-controls', summary.id)

  toggle.addEventListener('click', () => {
    const expanded = skill.classList.toggle('-expanded')
    toggle.setAttribute('aria-expanded', String(expanded))
  })

  summary.before(toggle)
  // only collapse once the toggle is in place, so the summary is never unreachable
  skill.classList.add('-collapsible')
})
