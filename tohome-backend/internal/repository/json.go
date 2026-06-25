package repository

// Lightweight JSON wrapper that delegates to json_impl.go
var json = jsonStdlib

var jsonStdlib = struct {
	Marshal   func(v interface{}) ([]byte, error)
	Unmarshal func(data []byte, v interface{}) error
}{
	Marshal:   jsonMarshal,
	Unmarshal: jsonUnmarshal,
}

func jsonMarshal(v interface{}) ([]byte, error) {
	return jsonEncode(v)
}

func jsonUnmarshal(data []byte, v interface{}) error {
	return jsonDecode(data, v)
}
