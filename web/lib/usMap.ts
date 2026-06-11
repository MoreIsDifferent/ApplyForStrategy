import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import statesTopology from 'us-atlas/states-albers-10m.json';

export interface StatePath {
  name: string;
  d: string;
}

export function getUSStatePaths(): StatePath[] {
  const topology = statesTopology as unknown as Topology;
  const states = topology.objects.states as GeometryCollection;
  const collection = feature(topology, states);
  const path = geoPath();

  return collection.features.map((f) => ({
    name: (f.properties as { name: string }).name,
    d: path(f) ?? '',
  }));
}
