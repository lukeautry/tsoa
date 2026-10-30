package main

// Ports tests/unit/metadataGeneration/transformer/{enumTransformer,referenceTransformer}.spec.ts.
// Dropped: EnumTransformer.merge with null arguments and mergeMany([]) returning undefined, which have no Go counterpart.
// The specs' `additionalProperties: false` stands in for "none" and is written as an absent key: real metadata
// only ever holds a type or nothing there, and mergeRefObj tests for presence, not JavaScript truthiness.

import (
	"reflect"
	"strings"
	"testing"
)

// defined drops the keys holding undefined, recursively, as the encoder does, so a merge's `"example": nil`
// matches an expectation that leaves the key out.
func defined(value any) any {
	switch v := value.(type) {
	case Obj:
		out := Obj{}
		for k, item := range v {
			if !isUndefined(item) {
				out[k] = defined(item)
			}
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = defined(item)
		}
		return out
	}
	return value
}

func expectObj(t *testing.T, got, want Obj) {
	t.Helper()
	if g, w := defined(got), defined(want); !reflect.DeepEqual(g, w) {
		t.Errorf("got  %#v\nwant %#v", g, w)
	}
}

// expectMetadataError runs fn and checks that it panics with a *MetadataError whose message starts with prefix.
func expectMetadataError(t *testing.T, prefix string, fn func()) {
	t.Helper()
	defer func() {
		t.Helper()
		err, ok := recover().(*MetadataError)
		if !ok {
			t.Fatalf("expected a *MetadataError panic")
		}
		if !strings.HasPrefix(err.Message, prefix) {
			t.Errorf("message %q does not start with %q", err.Message, prefix)
		}
	}()
	fn()
}

func enumType(enums, varnames []any, description string, deprecated bool) Obj {
	o := Obj{"dataType": "refEnum", "refName": "TestEnum", "deprecated": deprecated}
	if enums != nil {
		o["enums"] = enums
	}
	if varnames != nil {
		o["enumVarnames"] = varnames
	}
	if description != "" {
		o["description"] = description
	}
	return o
}

func objectType(properties []any, description string, deprecated bool) Obj {
	return Obj{"dataType": "refObject", "refName": "TestObject", "properties": properties, "description": description, "deprecated": deprecated}
}

func property(name string) Obj {
	return Obj{"name": name, "type": Obj{"dataType": "string"}, "required": true}
}

func TestMergeEnums(t *testing.T) {
	t.Run("concatenates values and joins descriptions", func(t *testing.T) {
		got := mergeEnums(enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false), enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", true))
		expectObj(t, got, enumType([]any{"value1", "value2"}, []any{"VALUE1", "VALUE2"}, "First enum\nSecond enum", true))
	})

	t.Run("missing description takes the other", func(t *testing.T) {
		got := mergeEnums(enumType([]any{"value1"}, []any{"VALUE1"}, "", false), enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false))
		expectObj(t, got, enumType([]any{"value1", "value2"}, []any{"VALUE1", "VALUE2"}, "Second enum", false))
	})

	t.Run("missing enumVarnames takes the other", func(t *testing.T) {
		got := mergeEnums(enumType([]any{"value1"}, nil, "First enum", false), enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false))
		expectObj(t, got, enumType([]any{"value1", "value2"}, []any{"VALUE2"}, "First enum\nSecond enum", false))
	})

	t.Run("missing enums takes the other", func(t *testing.T) {
		got := mergeEnums(enumType(nil, []any{"VALUE1"}, "First enum", false), enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false))
		expectObj(t, got, enumType([]any{"value2"}, []any{"VALUE1", "VALUE2"}, "First enum\nSecond enum", false))
	})

	t.Run("first example wins", func(t *testing.T) {
		first := enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false)
		first["example"] = "example1"
		second := enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false)
		second["example"] = "example2"
		want := enumType([]any{"value1", "value2"}, []any{"VALUE1", "VALUE2"}, "First enum\nSecond enum", false)
		want["example"] = "example1"
		expectObj(t, mergeEnums(first, second), want)
	})

	t.Run("first title wins", func(t *testing.T) {
		first := enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false)
		first["title"] = "First Title"
		second := enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false)
		second["title"] = "Second Title"
		if got := mergeEnums(first, second)["title"]; got != "First Title" {
			t.Errorf("title = %v", got)
		}
	})

	t.Run("second title when the first has none", func(t *testing.T) {
		second := enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false)
		second["title"] = "Second Title"
		if got := mergeEnums(enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false), second)["title"]; got != "Second Title" {
			t.Errorf("title = %v", got)
		}
	})

	t.Run("no title key without a title", func(t *testing.T) {
		got := mergeEnums(enumType([]any{"value1"}, nil, "", false), enumType([]any{"value2"}, nil, "", false))
		if _, ok := got["title"]; ok {
			t.Errorf("unexpected title %v", got["title"])
		}
	})
}

func TestMergeReferenceTypes(t *testing.T) {
	t.Run("empty array", func(t *testing.T) {
		expectMetadataError(t, "Cannot merge empty reference types array", func() { mergeReferenceTypes(nil) })
	})

	t.Run("single element is returned as is", func(t *testing.T) {
		single := objectType([]any{}, "Test object", false)
		expectObj(t, mergeReferenceTypes([]Obj{single}), single)
		singleEnum := enumType([]any{"value1"}, []any{"VALUE1"}, "Test enum", false)
		expectObj(t, mergeReferenceTypes([]Obj{singleEnum}), singleEnum)
	})

	t.Run("mixed reference types", func(t *testing.T) {
		expectMetadataError(t, "These resolved type merge rules are not defined", func() {
			mergeReferenceTypes([]Obj{enumType([]any{"value1"}, []any{"VALUE1"}, "Test enum", false), objectType([]any{}, "Test object", false)})
		})
	})

	t.Run("two enums", func(t *testing.T) {
		got := mergeReferenceTypes([]Obj{
			enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false),
			enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false),
		})
		expectObj(t, got, enumType([]any{"value1", "value2"}, []any{"VALUE1", "VALUE2"}, "First enum\nSecond enum", false))
	})

	t.Run("three enums", func(t *testing.T) {
		got := mergeReferenceTypes([]Obj{
			enumType([]any{"value1"}, []any{"VALUE1"}, "First enum", false),
			enumType([]any{"value2"}, []any{"VALUE2"}, "Second enum", false),
			enumType([]any{"value3"}, []any{"VALUE3"}, "Third enum", true),
		})
		expectObj(t, got, enumType([]any{"value1", "value2", "value3"}, []any{"VALUE1", "VALUE2", "VALUE3"}, "First enum\nSecond enum\nThird enum", true))
	})

	t.Run("two objects", func(t *testing.T) {
		got := mergeReferenceTypes([]Obj{
			objectType([]any{property("id")}, "First object", false),
			objectType([]any{property("name")}, "Second object", false),
		})
		expectObj(t, got, objectType([]any{property("id"), property("name")}, "First object\nSecond object", false))
	})

	t.Run("additionalProperties become a union", func(t *testing.T) {
		first := objectType([]any{property("id")}, "First object", false)
		first["additionalProperties"] = Obj{"dataType": "string"}
		second := objectType([]any{property("name")}, "Second object", false)
		second["additionalProperties"] = Obj{"dataType": "double"}
		want := objectType([]any{property("id"), property("name")}, "First object\nSecond object", false)
		want["additionalProperties"] = Obj{"dataType": "union", "types": []any{Obj{"dataType": "string"}, Obj{"dataType": "double"}}}
		expectObj(t, mergeReferenceTypes([]Obj{first, second}), want)
	})

	t.Run("one-sided additionalProperties are kept", func(t *testing.T) {
		second := objectType([]any{property("name")}, "Second object", false)
		second["additionalProperties"] = Obj{"dataType": "double"}
		got := mergeReferenceTypes([]Obj{objectType([]any{property("id")}, "First object", false), second})
		if !reflect.DeepEqual(got["additionalProperties"], Obj{"dataType": "double"}) {
			t.Errorf("additionalProperties = %#v", got["additionalProperties"])
		}
	})

	t.Run("first example wins", func(t *testing.T) {
		first := objectType([]any{property("id")}, "First object", false)
		first["example"] = "example1"
		second := objectType([]any{property("name")}, "Second object", false)
		second["example"] = "example2"
		want := objectType([]any{property("id"), property("name")}, "First object\nSecond object", false)
		want["example"] = "example1"
		expectObj(t, mergeReferenceTypes([]Obj{first, second}), want)
	})

	t.Run("deprecated if any is", func(t *testing.T) {
		got := mergeReferenceTypes([]Obj{
			objectType([]any{property("id")}, "First object", false),
			objectType([]any{property("name")}, "Second object", true),
		})
		expectObj(t, got, objectType([]any{property("id"), property("name")}, "First object\nSecond object", true))
	})

	t.Run("first title wins", func(t *testing.T) {
		first := objectType([]any{property("id")}, "First object", false)
		first["title"] = "FirstTitle"
		second := objectType([]any{property("name")}, "Second object", false)
		second["title"] = "SecondTitle"
		want := objectType([]any{property("id"), property("name")}, "First object\nSecond object", false)
		want["title"] = "FirstTitle"
		expectObj(t, mergeReferenceTypes([]Obj{first, second}), want)
	})

	t.Run("properties already present are not repeated", func(t *testing.T) {
		object := objectType([]any{property("id")}, "Test object", false)
		expectObj(t, mergeReferenceTypes([]Obj{object, object}), objectType([]any{property("id")}, "Test object\nTest object", false))
	})

	t.Run("three objects", func(t *testing.T) {
		got := mergeReferenceTypes([]Obj{
			objectType([]any{property("id")}, "First object", false),
			objectType([]any{property("name")}, "Second object", false),
			objectType([]any{property("email")}, "Third object", true),
		})
		expectObj(t, got, objectType([]any{property("id"), property("name"), property("email")}, "First object\nSecond object\nThird object", true))
	})
}
