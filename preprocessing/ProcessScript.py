def run():
    import pandas as pd
    import geopandas as gpd

    # Load
    #csv = pd.read_csv("Jefferson_County_Parcels.csv")
    geo = gpd.read_file("Jefferson_County_Parcels.geojson")
#
    ## Merge
    #merged = geo.merge(csv, on="PARCELID")

    # Keep only needed fields
    #merged["AssdValue"] = merged["AssdValue_x"].fillna(merged["AssdValue_y"])
    #merged["GIS_ACRES"] = merged["GIS_ACRES_x"].fillna(merged["GIS_ACRES_y"])
    geo["ValuePerAcre"] = geo["AssdValue"] / geo["GIS_ACRES"]

    # Drop all other columns except what you need
    geo = geo[geo['Property_City'].isin([
        "Birmingham", "Homewood", "Mountain Brook", "Vestavia Hills", "Fultondale", "Tarrant", "Pratt City", "Forestdale"
    ])]
    geo = geo[["PARCELID", "AssdValue", "GIS_ACRES", "ValuePerAcre", "PrevParcelTotal"
    ,"OWNERNAME","PROP_MAIL","ADDR_APR","NbhName","ZIP_MAIL","CITY","DISTRICT","ZONING_BOE","BLDG_IND","Cls","geometry"]]


    # Optional: Save merged output
    geo.to_file("data_clean_extended.geojson", driver="GeoJSON")

    return geo

run()