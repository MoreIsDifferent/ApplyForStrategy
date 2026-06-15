import itertools


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table):
        self.table = table
        self.filters = []
        self.op = None
        self.payload = None
        self.range_bounds = None

    def select(self, _cols):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.op = "update"
        self.payload = payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, value):
        self.filters.append(("eq", col, value))
        return self

    def ilike(self, col, value):
        self.filters.append(("ilike", col, value))
        return self

    def range(self, start, end):
        self.range_bounds = (start, end)
        return self

    def is_(self, col, value):
        self.filters.append(("is", col, value))
        return self

    def _matches(self, row):
        for kind, col, value in self.filters:
            if kind == "eq" and row.get(col) != value:
                return False
            elif kind == "ilike" and str(row.get(col, "")).lower() != str(value).lower():
                return False
            elif kind == "is":
                is_null = row.get(col) is None
                if value == "null" and not is_null:
                    return False
                if value != "null" and is_null:
                    return False
        return True

    def execute(self):
        rows = self.table.rows
        if self.op == "select":
            matched = [dict(row) for row in rows if self._matches(row)]
            if self.range_bounds is not None:
                start, end = self.range_bounds
                matched = matched[start : end + 1]
            return FakeResult(matched)
        if self.op == "insert":
            new_row = dict(self.payload)
            new_row["id"] = self.table.next_id()
            rows.append(new_row)
            return FakeResult([dict(new_row)])
        if self.op == "update":
            updated = []
            for row in rows:
                if self._matches(row):
                    row.update(self.payload)
                    updated.append(dict(row))
            return FakeResult(updated)
        if self.op == "delete":
            removed = [row for row in rows if self._matches(row)]
            self.table.rows[:] = [row for row in rows if not self._matches(row)]
            return FakeResult(removed)
        raise ValueError("No operation specified")


class FakeTable:
    def __init__(self, name):
        self.name = name
        self.rows: list[dict] = []
        self._ids = itertools.count(1)

    def next_id(self):
        return f"{self.name}-{next(self._ids)}"


class FakeSupabaseClient:
    def __init__(self):
        self.tables: dict[str, FakeTable] = {}

    def table(self, name):
        if name not in self.tables:
            self.tables[name] = FakeTable(name)
        return FakeQuery(self.tables[name])

    def seed(self, table_name, rows):
        table = self.tables.setdefault(table_name, FakeTable(table_name))
        for row in rows:
            row = dict(row)
            row.setdefault("id", table.next_id())
            table.rows.append(row)
        return table.rows
