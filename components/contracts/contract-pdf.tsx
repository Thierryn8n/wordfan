import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

export interface ContractPdfData {
  title: string
  contentMd: string
  companyLogoUrl?: string | null
  artistLogoUrl?: string | null
  companyName: string
  artistName: string
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontSize: 10,
    lineHeight: 1.55,
    color: '#1a1a1a',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
    marginBottom: 24,
  },
  logoBox: { width: 120, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  logoBoxRight: { width: 120, height: 48, alignItems: 'flex-end', justifyContent: 'center' },
  logo: { maxWidth: 120, maxHeight: 48, objectFit: 'contain' },
  logoLabel: { fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  logoName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  centerHead: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
    textAlign: 'center',
    marginBottom: 4,
  },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', marginTop: 14, marginBottom: 5 },
  h3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 7, textAlign: 'justify' },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 8 },
  bullet: { width: 12, fontFamily: 'Helvetica-Bold' },
  listText: { flex: 1, textAlign: 'justify' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999',
  },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 },
  signBox: { width: '44%', alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderTopColor: '#333', width: '100%', marginBottom: 4 },
  signLabel: { fontSize: 8, color: '#555', textAlign: 'center' },
})

interface Block {
  type: 'h2' | 'h3' | 'p' | 'li'
  text: string
}

/** Converte o markdown simples da IA em blocos renderizáveis pelo react-pdf. */
function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.replace(/\r/g, '').split('\n')
  let paragraph: string[] = []

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: cleanInline(paragraph.join(' ')) })
      paragraph = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('### ')) {
      flush()
      blocks.push({ type: 'h3', text: cleanInline(line.slice(4)) })
    } else if (line.startsWith('## ')) {
      flush()
      blocks.push({ type: 'h2', text: cleanInline(line.slice(3)) })
    } else if (line.startsWith('# ')) {
      flush()
      blocks.push({ type: 'h2', text: cleanInline(line.slice(2)) })
    } else if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flush()
      blocks.push({ type: 'li', text: cleanInline(line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '')) })
    } else {
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}

/** Remove marcações inline (negrito/itálico) que o react-pdf não interpreta. */
function cleanInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

function LogoOrName({ url, name, align }: { url?: string | null; name: string; align: 'left' | 'right' }) {
  return (
    <View style={align === 'right' ? styles.logoBoxRight : styles.logoBox}>
      {url ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={url} style={styles.logo} />
      ) : (
        <Text style={styles.logoName}>{name}</Text>
      )}
    </View>
  )
}

export function ContractDocument(data: ContractPdfData) {
  const blocks = parseMarkdown(data.contentMd)

  return (
    <Document title={data.title} author={data.companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <LogoOrName url={data.artistLogoUrl} name={data.artistName} align="left" />
          <View style={styles.centerHead}>
            <Text style={styles.logoLabel}>Contrato</Text>
          </View>
          <LogoOrName url={data.companyLogoUrl} name={data.companyName} align="right" />
        </View>

        <Text style={styles.title}>{data.title}</Text>

        {blocks.map((b, i) => {
          if (b.type === 'h2') return <Text key={i} style={styles.h2}>{b.text}</Text>
          if (b.type === 'h3') return <Text key={i} style={styles.h3}>{b.text}</Text>
          if (b.type === 'li')
            return (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{b.text}</Text>
              </View>
            )
          return <Text key={i} style={styles.paragraph}>{b.text}</Text>
        })}

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>{data.artistName}</Text>
            <Text style={styles.signLabel}>Contratado(a)</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>{data.companyName}</Text>
            <Text style={styles.signLabel}>Contratante</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{data.companyName}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
          <Text>Gerado em {data.generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
