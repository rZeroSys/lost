import argparse

from lost.db import model, access
from lost.logic.config import LOSTConfig
import pandas as pd


def main(name_of_pipe: str = "WW16D2", file_name: str = 'annos_WW16D2.csv'):
    """

    Args:
        name_of_pipe: Name of the pipe that needs triggered export.
        file_name: Name of the file with exported bbox annotations

    """
    lostconfig = LOSTConfig()
    dbm = access.DBMan(lostconfig)
    pipe = dbm.session.query(model.Pipe) \
        .filter(model.Pipe.name == name_of_pipe).first()
    if pipe is None:
        print("pipe was not found")
        return
    print(f"Reading: {pipe.name}")
    anno_task = next((pe.anno_task for pe in pipe.pe_list if pe.anno_task is not None))
    annotations = dbm.session.query(model.ImageAnno) \
        .filter(model.ImageAnno.anno_task_id == anno_task.idx).all()
    print(f'Images: {len(annotations)}')

    df_list = []
    for img_anno in annotations:
        df_list.append(img_anno.to_df())
    df = pd.concat(df_list)

    print(f"Labels: {len(df)}")
    df.to_csv(path_or_buf=file_name,
              sep=',',
              header=True,
              index=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Recover annotations from a pipeline regardless of the pipeline's state.")
    parser.add_argument('--pipe', action='store', default='WW16D2',
                        help='Name of the pipe, e.g. WW16D2.')
    parser.add_argument('--csv', action='store', default='annos_WW16D2.csv',
                        help='Name of the output csv with annotations.')
    args = parser.parse_args()
    main(args.pipe, args.csv)
