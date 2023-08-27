import React, { useState, useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Draw, Modify } from 'ol/interaction';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { get as getProjection } from 'ol/proj';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

const MapPage = () => {
  const mapRef = useRef(null);
  const popupRef = useRef(null);

  const [map, setMap] = useState(null);
  const [popupCoordinates, setPopupCoordinates] = useState(null);
  const [featureDetails, setFeatureDetails] = useState({ name: '' });
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    const raster = new TileLayer({
      source: new OSM(),
    });

    const source = new VectorSource();
    const vector = new VectorLayer({
      source: source,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#ffcc33',
        'stroke-width': 2,
        'circle-radius': 7,
        'circle-fill-color': '#ffcc33',
      },
    });

    const extent = getProjection('EPSG:3857').getExtent().slice();
    extent[0] += extent[0];
    extent[2] += extent[2];

    const newMap = new Map({
      layers: [raster, vector],
      target: mapRef.current,
      view: new View({
        center: [-11000000, 4600000],
        zoom: 4,
        extent,
      }),
    });

    setMap(newMap);



    const overlay = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      stopEvent: false,
    });
    newMap.addOverlay(overlay);

    newMap.on('click', (event) => {
      const isInsidePopup = popupRef.current.contains(event.originalEvent.target);

      if (!isInsidePopup) {
        setPopupCoordinates(event.coordinate);
        overlay.setPosition(event.coordinate);
      }
    });

    // Load features from local storage
    const storedFeatures = window.localStorage.getItem('features');
    if (storedFeatures) {
      const parsedFeatures = JSON.parse(storedFeatures);
      setFeatures(parsedFeatures);
      parsedFeatures.forEach((feature) => {
        const newFeature = new Feature({
          geometry: new Point(feature.geometry),
          name: feature.name,
        });
        source.addFeature(newFeature);
      });
    }

    return () => {
      newMap.setTarget(null);
    };
  }, []);

  const handleFeatureNameChange = (event) => {
    setFeatureDetails({ ...featureDetails, name: event.target.value });
  };

  const handleSaveFeature = () => {
    if (popupCoordinates && featureDetails.name) {
      const newFeature = {
        geometry: popupCoordinates,
        name: featureDetails.name,
      };

      // Add the feature to the OpenLayers vector source
      const source = map.getLayers().getArray()[1].getSource();
      const newOLFeature = new Feature({
        geometry: new Point(popupCoordinates),
        name: featureDetails.name,
      });
      source.addFeature(newOLFeature);

      setFeatures([...features, newFeature]);

      setPopupCoordinates(null);
      setFeatureDetails({ name: '' });

      // Save features to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('features', JSON.stringify([...features, newFeature]));
      }
    }
  };

  const handleRemoveFeature = (index) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);

    window.localStorage.setItem('features', JSON.stringify(updatedFeatures));

    const source = map.getLayers().getArray()[1].getSource();
    source.removeFeature(source.getFeatures()[index]);
  };

  return (
    <div className="relative h-screen">
      <div ref={mapRef} className="w-full h-full" />
      <div
        ref={popupRef}
        className="absolute bg-white p-2 rounded shadow z-10"
        style={{
          display: popupCoordinates ? 'block' : 'none',
          left: '20px',
          top: '20px',
        }}
      >
        <input
          type="text"
          placeholder="Enter feature name"
          value={featureDetails.name}
          onChange={handleFeatureNameChange}
          className="mb-2 w-full px-2 py-1 border rounded z-10"
        />
        <button
          onClick={handleSaveFeature}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 z-10"
        >
          Save
        </button>
      </div>

      <div className="absolute right-0 top-0 bg-white p-4 w-1/4 h-full shadow">
        <h2 className="text-xl mb-2">Saved Features</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Coordinates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr key={index}>
                <td>{feature.name}</td>
                <td
                  onClick={() => {
                    const geometry = feature.geometry;
                    map.getView().setCenter(geometry);
                  }}
                  className="cursor-pointer text-blue-500"
                >
                  {feature.geometry}
                </td>
                <td>
                  <button
                    onClick={() => handleRemoveFeature(index)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MapPage;
