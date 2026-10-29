package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
)

// Obj is a metadata object, such as a Tsoa.Type or Tsoa.Property. Like the JavaScript object literals it stands
// for, an absent key is `undefined`; a key holding Null is `null`.
type Obj = map[string]any

type jsonNull struct{}

func (jsonNull) MarshalJSON() ([]byte, error) { return []byte("null"), nil }

// Null is JSON null, as in `enums: [null]` or `default: null`.
var Null any = jsonNull{}

// referenceTypeMap keeps the reference types by refName in the order they were added, as a JavaScript object does.
type referenceTypeMap struct {
	names []string
	types map[string]Obj
}

func newReferenceTypeMap() *referenceTypeMap {
	return &referenceTypeMap{types: map[string]Obj{}}
}

func (m *referenceTypeMap) set(name string, t Obj) {
	if _, ok := m.types[name]; !ok {
		m.names = append(m.names, name)
	}
	m.types[name] = t
}

func (m *referenceTypeMap) get(name string) Obj { return m.types[name] }

var referenceDataTypes = map[string]bool{"refObject": true, "refEnum": true, "refAlias": true}

// isUndefined reports whether a value is JavaScript's undefined: nothing, or a nil object or array.
func isUndefined(value any) bool {
	switch v := value.(type) {
	case nil:
		return true
	case Obj:
		return v == nil
	case []any:
		return v == nil
	}
	return false
}

// encodeMetadata writes the metadata with every reference type of the map written once, in the map.
func encodeMetadata(metadata Obj, refs *referenceTypeMap) (json.RawMessage, error) {
	e := &encoder{refs: refs, inline: map[any]bool{}}
	var buf bytes.Buffer
	buf.WriteString(`{"controllers":`)
	if err := e.value(&buf, metadata["controllers"], false); err != nil {
		return nil, err
	}
	buf.WriteString(`,"referenceTypeMap":{`)
	for i, name := range refs.names {
		if i > 0 {
			buf.WriteByte(',')
		}
		key, _ := json.Marshal(name)
		buf.Write(key)
		buf.WriteByte(':')
		if err := e.value(&buf, refs.types[name], true); err != nil {
			return nil, err
		}
	}
	buf.WriteString(`}}`)
	return buf.Bytes(), nil
}

type encoder struct {
	refs   *referenceTypeMap
	inline map[any]bool
}

func (e *encoder) value(buf *bytes.Buffer, v any, definition bool) error {
	switch v := v.(type) {
	case Obj:
		if !definition {
			if dataType, _ := v["dataType"].(string); referenceDataTypes[dataType] {
				if name, ok := v["refName"].(string); ok && e.refs.get(name) != nil {
					buf.WriteString(`{"$tsoaRef":`)
					key, _ := json.Marshal(name)
					buf.Write(key)
					buf.WriteByte('}')
					return nil
				}
			}
		}
		keys := make([]string, 0, len(v))
		for k, value := range v {
			if !isUndefined(value) {
				keys = append(keys, k)
			}
		}
		sort.Strings(keys)
		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			writeJSONString(buf, k)
			buf.WriteByte(':')
			if err := e.value(buf, v[k], false); err != nil {
				return err
			}
		}
		buf.WriteByte('}')
		return nil
	case []Obj:
		items := make([]any, len(v))
		for i, item := range v {
			items[i] = item
		}
		return e.value(buf, items, false)
	case []any:
		buf.WriteByte('[')
		for i, item := range v {
			if i > 0 {
				buf.WriteByte(',')
			}
			if isUndefined(item) {
				// JSON has no undefined; the JavaScript side turns this back into undefined.
				buf.WriteString(`{"$tsoaUndefined":true}`)
				continue
			}
			if err := e.value(buf, item, false); err != nil {
				return err
			}
		}
		buf.WriteByte(']')
		return nil
	case string:
		writeJSONString(buf, v)
		return nil
	case float64:
		buf.WriteString(strconv.FormatFloat(v, 'f', -1, 64))
		return nil
	case bool:
		buf.WriteString(strconv.FormatBool(v))
		return nil
	case jsonNull:
		buf.WriteString("null")
		return nil
	default:
		out, err := json.Marshal(v)
		if err != nil {
			return err
		}
		buf.Write(out)
		return nil
	}
}

// writeJSONString writes a string as JSON, as JSON.stringify does.
func writeJSONString(buf *bytes.Buffer, s string) {
	buf.WriteByte('"')
	start := 0
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 0x20 && c != '"' && c != '\\' {
			continue
		}
		buf.WriteString(s[start:i])
		switch c {
		case '"':
			buf.WriteString(`\"`)
		case '\\':
			buf.WriteString(`\\`)
		case '\n':
			buf.WriteString(`\n`)
		case '\r':
			buf.WriteString(`\r`)
		case '\t':
			buf.WriteString(`\t`)
		case '\b':
			buf.WriteString(`\b`)
		case '\f':
			buf.WriteString(`\f`)
		default:
			fmt.Fprintf(buf, `\u%04x`, c)
		}
		start = i + 1
	}
	buf.WriteString(s[start:])
	buf.WriteByte('"')
}
