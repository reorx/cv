import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describe,
  it,
} from 'node:test';

import {
  cvToMarkdown,
  getCVTitle,
} from '../generate_md.mjs';

const baseCV = {
  basics: {
    name: 'Jane Doe',
    label: 'Software Engineer',
    email: 'jane@example.com',
    phone: '123 456',
    url: 'https://jane.dev/',
    summary: 'Building things.',
    location: { city: 'Hangzhou', countryCode: 'China' },
    profiles: [],
  },
}

function render(extra) {
  return cvToMarkdown({ ...baseCV, ...extra })
}

describe('basics', () => {
  it('renders name as H1 followed by label, summary and contact list', () => {
    const md = render()
    assert.match(md, /^# Jane Doe\n\n\*\*Software Engineer\*\*\n\nBuilding things\.\n/)
    assert.match(md, /^- Website: \[jane\.dev\]\(https:\/\/jane\.dev\/\)$/m)
    assert.match(md, /^- Email: \[jane@example\.com\]\(mailto:jane@example\.com\)$/m)
    assert.match(md, /^- Phone: 123 456$/m)
    assert.match(md, /^- Location: Hangzhou, China$/m)
  })

  it('lists profiles in the contact list', () => {
    const md = render({
      basics: { ...baseCV.basics, profiles: [{ network: 'GitHub', username: 'jane', url: 'https://github.com/jane' }] },
    })
    assert.match(md, /^- GitHub: \[github\.com\/jane\]\(https:\/\/github\.com\/jane\)$/m)
  })

  it('omits missing contact fields', () => {
    const md = cvToMarkdown({ basics: { name: 'Jane Doe' } })
    assert.equal(md, '# Jane Doe\n')
  })
})

describe('dates', () => {
  it('formats start/end dates as "MMM YYYY – MMM YYYY"', () => {
    const md = render({ work: [{ name: 'A', position: 'Dev', startDate: '2014-03-01', endDate: '2016-03-01' }] })
    assert.match(md, /\*\*Dev\*\* · Mar 2014 – Mar 2016/)
  })

  it('shows "Present" when there is no end date', () => {
    const md = render({ work: [{ name: 'A', position: 'Dev', startDate: '2020-06-01' }] })
    assert.match(md, /\*\*Dev\*\* · Jun 2020 – Present/)
  })

  it('shows "Until" when there is only an end date', () => {
    const md = render({ work: [{ name: 'A', position: 'Dev', endDate: '2020-06' }] })
    assert.match(md, /\*\*Dev\*\* · Until Jun 2020/)
  })

  it('keeps year-only dates as they are', () => {
    const md = render({ work: [{ name: 'A', position: 'Dev', startDate: '2019', endDate: '2021' }] })
    assert.match(md, /\*\*Dev\*\* · 2019 – 2021/)
  })

  it('ignores empty date strings', () => {
    const md = render({ work: [{ name: 'A', position: 'Dev', startDate: '', endDate: '' }] })
    assert.match(md, /^\*\*Dev\*\*$/m)
  })
})

describe('work', () => {
  it('links the company heading and keeps the markdown summary and highlights', () => {
    const md = render({
      work: [{
        name: 'Dine',
        url: 'https://dinehq.com',
        position: 'Technical Director',
        startDate: '2020-06-01',
        summary: '- Did **this**.\n- Did that.',
        highlights: ['Shipped it'],
      }],
    })
    assert.match(md, /## Work\n\n### \[Dine\]\(https:\/\/dinehq\.com\)\n\n\*\*Technical Director\*\* · Jun 2020 – Present\n\n- Did \*\*this\*\*\.\n- Did that\.\n\n- Shipped it\n/)
  })

  it('groups consecutive positions at the same company under one heading', () => {
    const md = render({
      work: [
        { name: 'Acme', position: 'Senior Dev', startDate: '2020-01' },
        { name: 'Acme', position: 'Dev', startDate: '2018-01', endDate: '2019-12' },
      ],
    })
    assert.equal(md.match(/### Acme/g).length, 1)
    assert.match(md, /\*\*Senior Dev\*\*/)
    assert.match(md, /\*\*Dev\*\* · Jan 2018 – Dec 2019/)
  })
})

describe('education', () => {
  it('renders study type, area, dates and GPA', () => {
    const md = render({
      education: [{
        institution: 'Wuhan University',
        url: 'https://www.whu.edu.cn/',
        studyType: 'Bachelor of Engineering',
        area: 'Computer Science',
        startDate: '2009-09-01',
        endDate: '2013-06-30',
        score: '2.98/4',
        courses: ['Algorithms', 'Networks'],
      }],
    })
    assert.match(md, /## Education\n\n### \[Wuhan University\]\(https:\/\/www\.whu\.edu\.cn\/\)\n\n\*\*Bachelor of Engineering, Computer Science\*\* · Sep 2009 – Jun 2013\n\nOverall GPA: 2\.98\/4\n\nCourses: Algorithms; Networks\n/)
  })
})

describe('projects', () => {
  const project = {
    name: 'Cashier',
    description: 'A clearing system.',
    keywords: ['Go', 'gRPC'],
    startDate: '2016-10-01',
    endDate: '2019-10-01',
    roles: ['Core Developer', 'Product Manager'],
  }

  it('renders a single highlight as a paragraph', () => {
    const md = render({ projects: [{ ...project, highlights: ['Designed it.'] }] })
    assert.match(md, /### Cashier\n\n\*\*Core Developer, Product Manager\*\* · Oct 2016 – Oct 2019\n\nA clearing system\.\n\nDesigned it\.\n\nKeywords: Go, gRPC\n/)
  })

  it('renders multiple highlights as a list', () => {
    const md = render({ projects: [{ ...project, highlights: ['One.', 'Two.'] }] })
    assert.match(md, /A clearing system\.\n\n- One\.\n- Two\.\n\nKeywords: Go, gRPC\n/)
  })
})

describe('side projects, skills and languages', () => {
  it('renders side projects with a linked heading and trimmed description', () => {
    const md = render({
      sideProjects: [{ name: 'httpstat', url: 'https://github.com/reorx/httpstat', description: 'A CLI tool.\n\n', keywords: [] }],
    })
    assert.match(md, /## Side-projects\n\n### \[httpstat\]\(https:\/\/github\.com\/reorx\/httpstat\)\n\nA CLI tool\.\n/)
    assert.doesNotMatch(md, /Keywords/)
  })

  it('renders skills with level and keywords', () => {
    const md = render({ skills: [{ name: 'Back-end Dev', level: 'Expert', keywords: ['Python', 'Go'] }] })
    assert.match(md, /## Skills\n\n### Back-end Dev\n\n\*\*Expert\*\*\n\nKeywords: Python, Go\n/)
  })

  it('renders languages with fluency and optional summary', () => {
    const md = render({
      languages: [
        { language: 'English', fluency: 'C1', summary: 'Fluent.' },
        { language: 'Chinese', fluency: 'Native', summary: '' },
      ],
    })
    assert.match(md, /## Languages\n\n### English\n\n\*\*C1\*\*\n\nFluent\.\n\n### Chinese\n\n\*\*Native\*\*\n/)
  })
})

describe('other sections', () => {
  it('renders awards, certificates, publications, references and interests', () => {
    const md = render({
      awards: [{ title: 'Best Hack', awarder: 'HackConf', date: '2019-05-01', summary: 'Won.' }],
      certificates: [{ name: 'CKA', issuer: 'CNCF', date: '2021-02', url: 'https://cncf.io/cka' }],
      publications: [{ name: 'Paper', publisher: 'ACM', releaseDate: '2018-01-01' }],
      references: [{ name: 'Bob', relationship: 'Manager', reference: 'Great engineer.' }],
      interests: [{ name: 'Music', keywords: ['Jazz'] }],
    })
    assert.match(md, /## Awards\n\n### Best Hack\n\n\*\*HackConf\*\* · May 2019\n\nWon\.\n/)
    assert.match(md, /## Certificates\n\n### \[CKA\]\(https:\/\/cncf\.io\/cka\)\n\n\*\*CNCF\*\* · Feb 2021\n/)
    assert.match(md, /## Publications\n\n### Paper\n\n\*\*ACM\*\* · Jan 2018\n/)
    assert.match(md, /## References\n\n### Bob\n\n\*\*Manager\*\*\n\nGreat engineer\.\n/)
    assert.match(md, /## Interests\n\n### Music\n\nKeywords: Jazz\n/)
  })

  it('omits sections that are missing or empty', () => {
    const md = render({ work: [], awards: [] })
    assert.doesNotMatch(md, /^## /m)
  })
})

describe('meta', () => {
  it('appends version and last modified date as a footer', () => {
    const md = render({ meta: { version: 'v1.3.1', lastModified: '2023-02-16T18:57:11+08:00Z' } })
    assert.match(md, /\n---\n\nVersion: v1\.3\.1 · Last modified: 2023-02-16\n$/)
  })

  it('derives the title from meta name and version, same as the PDF', () => {
    assert.equal(getCVTitle({ ...baseCV, meta: { name: 'Jane_Doe-CV', version: 'v2.0.0' } }), 'Jane_Doe-CV-v2.0.0')
    assert.equal(getCVTitle(baseCV), 'Jane Doe')
  })
})

describe('CLI', () => {
  it('writes <title>.md of cv.json into the given directory', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'cv-md-'))
    try {
      const cv = JSON.parse(readFileSync('cv.json', 'utf8'))
      execFileSync('node', ['generate_md.mjs', outDir])
      const md = readFileSync(join(outDir, `${getCVTitle(cv)}.md`), 'utf8')
      assert.equal(md, cvToMarkdown(cv))
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })
})
