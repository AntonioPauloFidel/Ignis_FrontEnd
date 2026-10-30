import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { type Block, type Inline, parseMarkdown } from '../../utils/markdown';

interface MarkdownProps {
  text: string;
  color?: string;
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const HEADING_SIZE = [0, 20, 18, 16.5, 15.5, 15, 15];

function Inlines({ nodes, color }: { nodes: Inline[]; color: string }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'bold':
            return (
              <Text key={index} style={styles.bold}>
                <Inlines nodes={node.children} color={color} />
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} style={styles.italic}>
                <Inlines nodes={node.children} color={color} />
              </Text>
            );
          case 'code':
            return (
              <Text key={index} style={styles.inlineCode}>
                {node.text}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                style={styles.link}
                onPress={() => Linking.openURL(node.url).catch(() => undefined)}
              >
                {node.text}
              </Text>
            );
          default:
            return node.text;
        }
      })}
    </>
  );
}

const inlineLength = (nodes: Inline[]): number =>
  nodes.reduce((total, node) => total + ('children' in node ? inlineLength(node.children) : node.text.length), 0);

// Largura de cada coluna pelo maior texto dela, para as linhas ficarem alinhadas
function columnWidths(rows: Inline[][][]) {
  const columns = Math.max(...rows.map((row) => row.length));

  return Array.from({ length: columns }, (_, column) => {
    const longest = Math.max(...rows.map((row) => (row[column] ? inlineLength(row[column]) : 0)));
    return Math.min(Math.max(longest * 7.5 + 22, 80), 230);
  });
}

function renderBlock(block: Block, key: number, color: string) {
  const base = { color, fontSize: 15, lineHeight: 22 };

  switch (block.type) {
    case 'heading':
      return (
        <Text
          key={key}
          style={[base, styles.heading, { fontSize: HEADING_SIZE[block.level], lineHeight: HEADING_SIZE[block.level] + 6 }]}
        >
          <Inlines nodes={block.inline} color={color} />
        </Text>
      );

    case 'paragraph':
      return (
        <Text key={key} style={base}>
          <Inlines nodes={block.inline} color={color} />
        </Text>
      );

    case 'list':
      return (
        <View key={key} style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={[styles.listItem, { paddingLeft: item.depth * 16 }]}>
              <Text style={[base, styles.bullet]}>{block.ordered ? `${item.number ?? index + 1}.` : '•'}</Text>
              <Text style={[base, styles.listText]}>
                <Inlines nodes={item.inline} color={color} />
              </Text>
            </View>
          ))}
        </View>
      );

    case 'code':
      return (
        <ScrollView key={key} horizontal style={styles.codeBlock} showsHorizontalScrollIndicator={false}>
          <Text style={styles.codeText} selectable>
            {block.text}
          </Text>
        </ScrollView>
      );

    case 'quote':
      return (
        <View key={key} style={styles.quote}>
          <Text style={[base, { opacity: 0.85 }]}>
            <Inlines nodes={block.inline} color={color} />
          </Text>
        </View>
      );

    case 'table': {
      const widths = columnWidths([block.header, ...block.rows]);

      return (
        <ScrollView key={key} horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            {[block.header, ...block.rows].map((row, rowIndex) => (
              <View key={rowIndex} style={[styles.tableRow, rowIndex === 0 && styles.tableHeader]}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={cellIndex}
                    style={[
                      { color, fontSize: 13.5, lineHeight: 19, width: widths[cellIndex] },
                      styles.tableCell,
                      rowIndex === 0 && styles.bold,
                    ]}
                  >
                    <Inlines nodes={cell} color={color} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }

    case 'rule':
      return <View key={key} style={styles.rule} />;
  }
}

/** Resposta da IA formatada: títulos, listas, código, tabelas, citações, negrito, itálico e links. */
export function Markdown({ text, color = colors.darkBlue }: MarkdownProps) {
  return <View style={styles.root}>{parseMarkdown(text).map((block, index) => renderBlock(block, index, color))}</View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  inlineCode: {
    fontFamily: MONO,
    fontSize: 13.5,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  heading: { fontWeight: '700', marginTop: 4 },
  list: { gap: 3 },
  listItem: { flexDirection: 'row', gap: 6 },
  bullet: { width: 18, textAlign: 'right' },
  listText: { flex: 1 },
  codeBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    maxHeight: 280,
  },
  codeText: { color: '#E2E8F0', fontFamily: MONO, fontSize: 13, lineHeight: 19 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  tableScroll: { marginVertical: 2 },
  table: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  tableHeader: { backgroundColor: 'rgba(37, 99, 235, 0.08)', borderTopWidth: 0 },
  tableCell: { paddingHorizontal: 10, paddingVertical: 6 },
  rule: { height: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
});
