package repository

import stdjson "encoding/json"

func jsonEncode(v interface{}) ([]byte, error) {
	return stdjson.Marshal(v)
}

func jsonDecode(data []byte, v interface{}) error {
	return stdjson.Unmarshal(data, v)
}
