import {
  mkdirSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

import cv from './cv.json' with { type: 'json' };

// Mirrors the section order and fields of jsoncv/src/themes/reorx/index.ejs

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getCVTitle(cv) {
  let {name, version} = cv.meta || {}
  if (!name) name = cv.basics.name || 'JSONCV'
  return `${name}${version ? '-' + version : ''}`
}

/* helpers */

function hasItems(arr) {
  return Array.isArray(arr) && arr.length > 0
}

function trim(text) {
  return (text || '').trim()
}

function noSchemaURL(url) {
  return url.replace(/https?:\/\//, '').replace(/\/$/, '')
}

function link(text, url) {
  return url ? `[${text}](${url})` : text
}

function list(items) {
  return items.map(item => `- ${trim(item)}`).join('\n')
}

// YYYY stays as is, YYYY-MM and YYYY-MM-DD become "MMM YYYY"
function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  if (!month) return year
  return `${MONTHS[Number(month) - 1]} ${year}`
}

function dateRange({startDate, endDate}) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} – ${end}`
  if (start) return `${start} – Present`
  if (end) return `Until ${end}`
  return ''
}

// "**title** · date", either part may be absent
function subtitle(title, date) {
  return [title && `**${title}**`, date].filter(Boolean).join(' · ')
}

function keywords(kws) {
  return hasItems(kws) ? `Keywords: ${kws.join(', ')}` : ''
}

function formatLocation(loc) {
  const cityToCountry = ['city', 'postalCode', 'region', 'countryCode'].map(key => loc[key]).filter(Boolean).join(', ')
  if (!loc.address) return cityToCountry
  return `${loc.address}. ${cityToCountry}`
}

/* sections */

function renderBasics(basics) {
  const location = basics.location ? formatLocation(basics.location) : ''
  const contacts = [
    basics.url && `Website: ${link(noSchemaURL(basics.url), basics.url)}`,
    basics.email && `Email: [${basics.email}](mailto:${basics.email})`,
    basics.phone && `Phone: ${basics.phone}`,
    location && `Location: ${location}`,
    ...(basics.profiles || []).map(p => `${p.network}: ${p.url ? link(noSchemaURL(p.url), p.url) : p.username}`),
  ].filter(Boolean)
  return [
    `# ${basics.name}`,
    basics.label && `**${basics.label}**`,
    trim(basics.summary),
    hasItems(contacts) && list(contacts),
  ]
}

function renderEducation(item) {
  return [
    `### ${link(item.institution, item.url)}`,
    subtitle([item.studyType, item.area].filter(Boolean).join(', '), dateRange(item)),
    item.score && `Overall GPA: ${item.score}`,
    hasItems(item.courses) && `Courses: ${item.courses.join('; ')}`,
  ]
}

// consecutive positions at the same company share one heading
function renderWork(item, index, items) {
  const isSameCompany = index > 0 && items[index - 1].name === item.name
  return [
    !isSameCompany && `### ${link(item.name, item.url)}`,
    subtitle(item.position, dateRange(item)),
    trim(item.summary),
    hasItems(item.highlights) && list(item.highlights),
  ]
}

function renderProject(item) {
  const highlights = item.highlights || []
  return [
    `### ${link(item.name, item.url)}`,
    subtitle((item.roles || []).join(', '), dateRange(item)),
    trim(item.description),
    highlights.length === 1 ? trim(highlights[0]) : hasItems(highlights) && list(highlights),
    keywords(item.keywords),
  ]
}

function renderSideProject(item) {
  return [
    `### ${link(item.name, item.url)}`,
    trim(item.description),
    keywords(item.keywords),
  ]
}

function renderSkill(item) {
  return [
    `### ${item.name}`,
    item.level && `**${item.level}**`,
    trim(item.summary),
    keywords(item.keywords),
  ]
}

function renderLanguage(item) {
  return [
    `### ${item.language}`,
    item.fluency && `**${item.fluency}**`,
    trim(item.summary),
  ]
}

function renderAward(item) {
  return [
    `### ${item.title}`,
    subtitle(item.awarder, formatDate(item.date)),
    trim(item.summary),
  ]
}

function renderCertificate(item) {
  return [
    `### ${link(item.name, item.url)}`,
    subtitle(item.issuer, formatDate(item.date)),
  ]
}

function renderVolunteer(item) {
  return [
    `### ${link(item.organization, item.url)}`,
    subtitle(item.position, dateRange(item)),
    trim(item.summary),
    hasItems(item.highlights) && list(item.highlights),
  ]
}

function renderPublication(item) {
  return [
    `### ${link(item.name, item.url)}`,
    subtitle(item.publisher, formatDate(item.releaseDate)),
    trim(item.summary),
  ]
}

function renderReference(item) {
  return [
    `### ${item.name}`,
    item.relationship && `**${item.relationship}**`,
    trim(item.reference),
  ]
}

function renderInterest(item) {
  return [
    `### ${item.name}`,
    keywords(item.keywords),
  ]
}

function renderMeta(meta) {
  const line = [
    meta.version && `Version: ${meta.version}`,
    meta.lastModified && `Last modified: ${meta.lastModified.slice(0, 10)}`,
  ].filter(Boolean).join(' · ')
  return line ? ['---', line] : []
}

function section(title, items, renderItem) {
  if (!hasItems(items)) return []
  return [`## ${title}`, ...items.flatMap(renderItem)]
}

export function cvToMarkdown(cv) {
  const blocks = [
    ...renderBasics(cv.basics),
    ...section('Education', cv.education, renderEducation),
    ...section('Work', cv.work, renderWork),
    ...section('Projects', cv.projects, renderProject),
    ...section('Side-projects', cv.sideProjects, renderSideProject),
    ...section('Skills', cv.skills, renderSkill),
    ...section('Languages', cv.languages, renderLanguage),
    ...section('Awards', cv.awards, renderAward),
    ...section('Certificates', cv.certificates, renderCertificate),
    ...section('Volunteer', cv.volunteer, renderVolunteer),
    ...section('Publications', cv.publications, renderPublication),
    ...section('References', cv.references, renderReference),
    ...section('Interests', cv.interests, renderInterest),
    ...(cv.meta ? renderMeta(cv.meta) : []),
  ]
  return blocks.filter(Boolean).join('\n\n') + '\n'
}

if (import.meta.main) {
  const destDir = process.argv[2] || 'tmp'
  mkdirSync(destDir, { recursive: true })
  const outputPath = join(destDir, `${getCVTitle(cv)}.md`)
  writeFileSync(outputPath, cvToMarkdown(cv))
  console.log(`generateMD completed: ${outputPath}`)
}
